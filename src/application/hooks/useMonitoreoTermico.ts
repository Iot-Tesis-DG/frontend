import { useEffect, useState } from 'react'

import type { LecturaTermica } from '@/domain/entities/LecturaTermica'
import { apiClient } from '@/infrastructure/api/apiClient'
import { suscribirseLecturas } from '@/infrastructure/sse/sseClient'

const MAX_LECTURAS_EN_MEMORIA = 60

interface MonitoreoTermico {
  ultima: LecturaTermica | null
  serie: LecturaTermica[]
  sseConectado: boolean
}

/**
 * Carga el historial reciente y se suscribe al flujo SSE en tiempo real.
 * La serie se mantiene en orden cronológico ascendente para las gráficas.
 */
export function useMonitoreoTermico(): MonitoreoTermico {
  const [serie, setSerie] = useState<LecturaTermica[]>([])
  const [sseConectado, setSseConectado] = useState(false)

  useEffect(() => {
    let activo = true

    apiClient
      .get<LecturaTermica[]>('/api/lecturas', { params: { limite: MAX_LECTURAS_EN_MEMORIA } })
      .then(({ data }) => {
        if (activo) setSerie([...data].reverse())
      })
      .catch(() => {
        /* el dashboard arranca vacío si el backend aún no tiene lecturas */
      })

    const cerrar = suscribirseLecturas(
      (lectura) => {
        setSerie((previa) => [...previa, lectura].slice(-MAX_LECTURAS_EN_MEMORIA))
      },
      (conectado) => setSseConectado(conectado),
    )

    return () => {
      activo = false
      cerrar()
    }
  }, [])

  return { ultima: serie.at(-1) ?? null, serie, sseConectado }
}
