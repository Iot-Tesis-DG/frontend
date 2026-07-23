import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileText } from 'lucide-react'

import { useReportesBPA } from '@/application/hooks/useReportesBPA'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input, Label } from '../components/ui/input'

function hoyISO(desplazamientoDias = 0): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + desplazamientoDias)
  return fecha.toISOString().slice(0, 10)
}

export function ReportesPage() {
  const { t } = useTranslation()
  const { reporte, generando, error, generar, descargarJson, descargarCsv } = useReportesBPA()

  const [desde, setDesde] = useState(hoyISO(-30))
  const [hasta, setHasta] = useState(hoyISO())
  const [deviceId, setDeviceId] = useState('')

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={t('nav.seccionCumplimiento')} titulo={t('reportes.titulo')} descripcion={t('reportes.descripcion')} />

      {/* ── Configuración del periodo ───────────────────────── */}
      <Card className="mb-5 animate-rise">
        <CardHeader>
          <CardTitle className="text-base">{t('reportes.rango')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 items-end gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault()
              void generar(desde, hasta, deviceId || undefined)
            }}
          >
            <div>
              <Label htmlFor="r-desde">{t('reportes.desde')}</Label>
              <Input
                id="r-desde"
                type="date"
                required
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="r-hasta">{t('reportes.hasta')}</Label>
              <Input
                id="r-hasta"
                type="date"
                required
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="r-device">{t('reportes.dispositivo')}</Label>
              <Input
                id="r-device"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="FARM-01-CDL"
              />
            </div>
            <Button type="submit" disabled={generando}>
              <FileText />
              {generando ? t('reportes.generando') : t('reportes.generar')}
            </Button>
          </form>
          {error && (
            <p role="alert" className="mt-3 rounded-(--radius-field) bg-clay-100 px-3 py-2 text-[13px] text-clay-700">
              {t('reportes.errorGenerar')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Resumen ─────────────────────────────────────────── */}
      {reporte === null ? (
        <p className="animate-fade text-sm text-muted">{t('reportes.sinReporte')}</p>
      ) : (
        <Card className="animate-rise">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{t('reportes.resumen')}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={descargarCsv}>
                <Download />
                {t('reportes.descargarCsv')}
              </Button>
              <Button variant="secondary" size="sm" onClick={descargarJson}>
                <Download />
                {t('reportes.descargarJson')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 divide-x divide-border text-center">
              {(
                [
                  ['reportes.lecturas', reporte.lecturas.length],
                  ['reportes.alertas', reporte.alertas.length],
                  ['reportes.registrosTrazabilidad', reporte.registros_trazabilidad.length],
                ] as const
              ).map(([clave, cantidad]) => (
                <div key={clave} className="px-3 py-2">
                  <dt className="text-xs text-muted">{t(clave)}</dt>
                  <dd className="nums mt-1 text-2xl font-semibold tracking-tight">{cantidad}</dd>
                </div>
              ))}
            </dl>
            <p className="nums mt-4 text-center text-xs text-faint">
              {new Date(reporte.fecha_desde).toLocaleDateString('es-PE')} —{' '}
              {new Date(reporte.fecha_hasta).toLocaleDateString('es-PE')}
              {reporte.device_id && ` · ${reporte.device_id}`}
            </p>
            <p className="mt-3 border-t border-border pt-3 text-center text-xs leading-relaxed text-muted">
              {t('reportes.notaFormatos')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
