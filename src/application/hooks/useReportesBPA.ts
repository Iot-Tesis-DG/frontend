import { useCallback, useState } from 'react'

import type { AlertaTermica } from '@/domain/entities/AlertaTermica'
import type { LecturaTermica } from '@/domain/entities/LecturaTermica'
import type { RegistroTrazabilidad } from '@/domain/entities/RegistroTrazabilidad'
import { apiClient } from '@/infrastructure/api/apiClient'
import i18n from '@/infrastructure/i18n'

function descargarBlob(contenido: BlobPart, tipo: string, nombre: string): void {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}

function campoCsv(valor: string): string {
  // Excel y LibreOffice evalúan celdas que empiezan por fórmula incluso si
  // proceden de campos de datos. La comilla simple conserva el valor visible
  // como texto y se aplica antes del escape CSV convencional.
  const seguro = /^[=+\-@]/.test(valor.trimStart()) ? `'${valor}` : valor
  return /[";\n]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro
}

export interface ReporteBPA {
  device_id: string | null
  fecha_desde: string
  fecha_hasta: string
  lecturas: LecturaTermica[]
  alertas: AlertaTermica[]
  registros_trazabilidad: RegistroTrazabilidad[]
}

export function useReportesBPA() {
  const [reporte, setReporte] = useState<ReporteBPA | null>(null)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(false)

  const generar = useCallback(async (desde: string, hasta: string, deviceId?: string) => {
    setGenerando(true)
    setError(false)
    try {
      const params: Record<string, string> = {
        fecha_desde: new Date(desde).toISOString(),
        fecha_hasta: new Date(`${hasta}T23:59:59`).toISOString(),
      }
      if (deviceId) params.device_id = deviceId
      const { data } = await apiClient.get<ReporteBPA>('/api/reportes/bpa', { params })
      setReporte(data)
    } catch {
      setError(true)
    } finally {
      setGenerando(false)
    }
  }, [])

  const descargarJson = useCallback(() => {
    if (!reporte) return
    descargarBlob(
      JSON.stringify(reporte, null, 2),
      'application/json',
      `reporte-bpa-${reporte.fecha_desde.slice(0, 10)}-${reporte.fecha_hasta.slice(0, 10)}.json`,
    )
  }, [reporte])

  const descargarCsv = useCallback(() => {
    if (!reporte) return
    const t = i18n.t.bind(i18n)
    const cabecera = [
      t('historial.fecha'),
      t('historial.dispositivo'),
      `${t('historial.tempInterna')} (°C)`,
      `${t('historial.tempAmbiental')} (°C)`,
      `${t('historial.humedad')} (%)`,
      t('historial.puerta'),
      t('historial.riesgo'),
    ]
    const filas = reporte.lecturas.map((l) =>
      [
        new Date(l.timestamp).toLocaleString(),
        l.device_id,
        l.temperatura_interna?.toFixed(1) ?? '',
        l.temperatura_ambiental?.toFixed(1) ?? '',
        l.humedad_ambiental?.toFixed(0) ?? '',
        l.apertura_refrigerador ? t('dashboard.puertaAbierta') : t('dashboard.puertaCerrada'),
        l.nivel_riesgo ? t(`riesgo.${l.nivel_riesgo}`) : '',
      ]
        .map(campoCsv)
        .join(';'),
    )
    // BOM UTF-8 + separador ';' para que Excel en español lo abra directo.
    const csv = '\uFEFF' + [cabecera.map(campoCsv).join(';'), ...filas].join('\r\n')
    descargarBlob(
      csv,
      'text/csv;charset=utf-8',
      `reporte-bpa-${reporte.fecha_desde.slice(0, 10)}-${reporte.fecha_hasta.slice(0, 10)}.csv`,
    )
  }, [reporte])

  return { reporte, generando, error, generar, descargarJson, descargarCsv }
}
