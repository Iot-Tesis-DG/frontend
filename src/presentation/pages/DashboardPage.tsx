import { useMemo } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { EChartsCoreOption } from 'echarts/core'
import { DoorClosed, DoorOpen, Droplets, RadioTower, Thermometer, Wind } from 'lucide-react'

import { useMonitoreoTermico } from '@/application/hooks/useMonitoreoTermico'
import type { LecturaTermica } from '@/domain/entities/LecturaTermica'
import { EChartWrapper } from '@/infrastructure/charts/EChartWrapper'
import { cn } from '@/lib/utils'
import { PageHeader } from '../components/PageHeader'
import { RiskBadge } from '../components/RiskBadge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'

function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function TarjetaMetrica({
  etiqueta,
  valor,
  unidad,
  icono: Icono,
  delta,
  retraso = 0,
  destacada = false,
}: {
  etiqueta: string
  valor: string
  unidad: string
  icono: React.ComponentType<{ className?: string }>
  delta?: number | null
  retraso?: number
  destacada?: boolean
}) {
  return (
    <Card
      className={cn('card-lift animate-rise', destacada && 'border-pine-200 bg-primary-tint/50')}
      style={{ animationDelay: `${retraso}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted">{etiqueta}</p>
          <span
            className={cn(
              'flex size-7 items-center justify-center rounded-md',
              destacada ? 'bg-pine-100 text-pine-600' : 'bg-cream-100 text-faint',
            )}
          >
            <Icono className="size-4" />
          </span>
        </div>
        <p className="mt-2 flex items-baseline gap-1">
          <span className="nums text-[32px] font-semibold leading-none tracking-tight">
            {valor}
          </span>
          <span className="text-sm text-muted">{unidad}</span>
          {delta != null && Math.abs(delta) >= 0.05 && (
            <span
              className={cn(
                'nums ml-auto text-xs font-medium',
                delta > 0 ? 'text-honey-600' : 'text-pine-600',
              )}
            >
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function construirOpcionCurva(serie: LecturaTermica[], etiquetas: {
  interna: string
  ambiental: string
}): EChartsCoreOption {
  const horas = serie.map((l) => formatearHora(l.timestamp))
  return {
    textStyle: { fontFamily: 'Instrument Sans, sans-serif', color: '#766458' },
    grid: { left: 44, right: 16, top: 32, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e1d7bd',
      textStyle: { color: '#2f2f3d', fontSize: 12 },
      valueFormatter: (v: unknown) => (typeof v === 'number' ? `${v.toFixed(1)} °C` : '—'),
    },
    legend: {
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 3,
      textStyle: { color: '#766458', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: horas,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e1d7bd' } },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#9c8d81' },
    },
    yAxis: {
      type: 'value',
      min: (value: { min: number }) => Math.floor(Math.min(value.min, 0)),
      max: (value: { max: number }) => Math.ceil(Math.max(value.max, 10)),
      splitLine: { lineStyle: { color: '#efe9d6' } },
      axisLabel: { fontSize: 11, color: '#9c8d81', formatter: '{value} °C' },
    },
    series: [
      {
        name: etiquetas.interna,
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: serie.map((l) => l.temperatura_interna),
        lineStyle: { width: 2.5, color: '#4e5366' },
        itemStyle: { color: '#4e5366' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(78, 83, 102, 0.14)' },
              { offset: 1, color: 'rgba(78, 83, 102, 0)' },
            ],
          },
        },
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(78, 83, 102, 0.06)' },
          data: [[{ yAxis: 2 }, { yAxis: 8 }]],
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#5d3237', type: 'dashed', width: 1 },
          label: { color: '#5d3237', fontSize: 10, formatter: '{c} °C' },
          data: [{ yAxis: 2 }, { yAxis: 8 }],
        },
      },
      {
        name: etiquetas.ambiental,
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: serie.map((l) => l.temperatura_ambiental),
        lineStyle: { width: 1.5, color: '#9c8d81', type: 'dashed' },
        itemStyle: { color: '#9c8d81' },
      },
    ],
  }
}

function resumenVentana(serie: LecturaTermica[]) {
  const temps = serie
    .map((l) => l.temperatura_interna)
    .filter((v): v is number => v != null)
  if (temps.length === 0) return null
  return {
    minima: Math.min(...temps),
    maxima: Math.max(...temps),
    promedio: temps.reduce((suma, v) => suma + v, 0) / temps.length,
    fueraDeRango: serie.filter((l) => l.nivel_riesgo === 'excursion_critica').length,
  }
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { ultima, serie, sseConectado } = useMonitoreoTermico()
  const previa = serie.at(-2) ?? null
  const resumen = resumenVentana(serie)

  const deltaDe = (
    actual: number | null | undefined,
    anterior: number | null | undefined,
  ): number | null =>
    actual != null && anterior != null ? actual - anterior : null

  const opcionCurva = useMemo(
    () =>
      construirOpcionCurva(serie, {
        interna: t('dashboard.tempInterna'),
        ambiental: t('dashboard.tempAmbiental'),
      }),
    [serie, t],
  )

  return (
    <div>
      <PageHeader eyebrow={t('nav.seccionOperacion')} titulo={t('dashboard.titulo')} descripcion={t('dashboard.descripcion')}>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
            sseConectado
              ? 'border-glacier-200 bg-glacier-100 text-glacier-700'
              : 'border-border bg-cream-200 text-muted',
          )}
        >
          <span className="relative flex size-2">
            {sseConectado && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glacier-600 opacity-60" />
            )}
            <span
              className={cn(
                'relative inline-flex size-2 rounded-full',
                sseConectado ? 'bg-glacier-600' : 'bg-faint',
              )}
            />
          </span>
          {sseConectado ? t('dashboard.conectado') : t('dashboard.desconectado')}
          <span className="text-faint">· {t('dashboard.tiempoReal')}</span>
        </span>
      </PageHeader>

      {ultima === null ? (
        <Card className="animate-rise">
          <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-cream-200 text-faint">
              <RadioTower className="size-6" />
            </span>
            <p className="font-medium text-foreground">{t('dashboard.esperandoDatos')}</p>
            <p className="max-w-sm text-sm text-muted">{t('dashboard.esperandoDetalle')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Métricas ────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaMetrica
              etiqueta={t('dashboard.tempInterna')}
              valor={ultima.temperatura_interna?.toFixed(1) ?? '—'}
              unidad="°C"
              icono={Thermometer}
              delta={deltaDe(ultima.temperatura_interna, previa?.temperatura_interna)}
              destacada
            />
            <TarjetaMetrica
              etiqueta={t('dashboard.tempAmbiental')}
              valor={ultima.temperatura_ambiental?.toFixed(1) ?? '—'}
              unidad="°C"
              icono={Wind}
              delta={deltaDe(ultima.temperatura_ambiental, previa?.temperatura_ambiental)}
              retraso={60}
            />
            <TarjetaMetrica
              etiqueta={t('dashboard.humedad')}
              valor={ultima.humedad_ambiental?.toFixed(0) ?? '—'}
              unidad="% HR"
              icono={Droplets}
              retraso={120}
            />
            <Card className="card-lift animate-rise" style={{ animationDelay: '180ms' }}>
              <CardContent className="p-5">
                <p className="text-[13px] font-medium text-muted">{t('dashboard.estadoActual')}</p>
                <div className="mt-2.5">
                  <RiskBadge nivel={ultima.nivel_riesgo} />
                </div>
                {ultima.nivel_riesgo && (
                  <p className="mt-1.5 text-xs leading-snug text-muted">
                    {t(`riesgo.detalle.${ultima.nivel_riesgo}`)}
                  </p>
                )}
                <p className="mt-1.5 text-xs leading-snug text-muted">
                  {ultima.estado_inferencia && ultima.estado_inferencia !== 'completada' ? (
                    <>
                      {t(`ia.estado.${ultima.estado_inferencia}`)}
                      {ultima.origen_clasificacion && <> · {t(`ia.origen.${ultima.origen_clasificacion}`)}</>}
                      {ultima.motivo_no_inferencia && <> · {ultima.motivo_no_inferencia}</>}
                    </>
                  ) : ultima.origen_clasificacion ? (
                    <>
                      {t(`ia.origen.${ultima.origen_clasificacion}`)}
                      {ultima.confianza_ia !== null && (
                        <> · {t('ia.confianza')} {(ultima.confianza_ia * 100).toFixed(0)}%</>
                      )}
                      {(ultima.modelo_version ?? ultima.model_version) && (
                        <> · {t('ia.version')} {ultima.modelo_version ?? ultima.model_version}</>
                      )}
                    </>
                  ) : (
                    t('ia.sinInferencia')
                  )}
                </p>
                <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-muted">
                  {ultima.apertura_refrigerador ? (
                    <>
                      <DoorOpen className="size-3.5 text-honey-600" />
                      {t('dashboard.puerta')}: {t('dashboard.puertaAbierta')}
                    </>
                  ) : (
                    <>
                      <DoorClosed className="size-3.5" />
                      {t('dashboard.puerta')}: {t('dashboard.puertaCerrada')}
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Curva térmica ───────────────────────────────── */}
          <Card className="mt-4 animate-rise" style={{ animationDelay: '240ms' }}>
            <CardHeader className="gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <CardTitle>{t('dashboard.curvaTermica')}</CardTitle>
                <CardDescription>
                  {t('dashboard.ultimasLecturas', { n: serie.length })} ·{' '}
                  {t('dashboard.rangoConservacion')}
                </CardDescription>
              </div>
              <p className="text-xs text-faint">
                {t('dashboard.dispositivo')}:{' '}
                <span className="nums text-ink-700">{ultima.device_id}</span>
              </p>
            </CardHeader>
            <CardContent>
              <EChartWrapper option={opcionCurva} height="320px" />

              {/* Resumen editorial de la ventana visible */}
              {resumen && (
                <dl className="mt-4 grid grid-cols-2 gap-y-3 border-t border-border pt-4 sm:grid-cols-4 sm:divide-x sm:divide-border">
                  {(
                    [
                      ['dashboard.resumenMinima', `${resumen.minima.toFixed(1)} °C`, false],
                      ['dashboard.resumenMaxima', `${resumen.maxima.toFixed(1)} °C`, false],
                      ['dashboard.resumenPromedio', `${resumen.promedio.toFixed(1)} °C`, false],
                      [
                        'dashboard.resumenFueraRango',
                        String(resumen.fueraDeRango),
                        resumen.fueraDeRango > 0,
                      ],
                    ] as const
                  ).map(([clave, valor, alerta]) => (
                    <div key={clave} className="px-3 text-center first:pl-0 last:pr-0">
                      <dt className="eyebrow">{t(clave)}</dt>
                      <dd
                        className={cn(
                          'nums mt-1 text-lg font-semibold tracking-tight',
                          alerta && 'text-clay-600',
                        )}
                      >
                        {valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>

          <p className="mt-3 text-right text-xs text-faint">
            {t('dashboard.ultimaActualizacion')}:{' '}
            <span className="nums">{formatearHora(ultima.timestamp)}</span> ·{' '}
            <Link to="/alertas" className="text-pine-600 underline-offset-2 hover:underline">
              {t('dashboard.verAlertas')}
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
