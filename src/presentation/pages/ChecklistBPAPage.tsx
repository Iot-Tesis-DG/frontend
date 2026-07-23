import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, RotateCcw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

const ITEMS_BPA = [
  'temperatura',
  'termometro',
  'registros',
  'alertasRevisadas',
  'accionesDocumentadas',
  'puerta',
  'limpieza',
  'exclusivo',
  'rotulado',
  'respaldo',
] as const

const CLAVE_STORAGE = 'checklist-bpa-estado'

function cargarEstado(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_STORAGE) ?? '{}')
  } catch {
    return {}
  }
}

export function ChecklistBPAPage() {
  const { t } = useTranslation()
  const [estado, setEstado] = useState<Record<string, boolean>>(cargarEstado)

  useEffect(() => {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(estado))
  }, [estado])

  const hechos = ITEMS_BPA.filter((item) => estado[item]).length
  const progreso = (hechos / ITEMS_BPA.length) * 100

  const alternar = (item: string) => {
    setEstado((previo) => ({ ...previo, [item]: !previo[item] }))
  }

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={t('nav.seccionCumplimiento')} titulo={t('checklist.titulo')} descripcion={t('checklist.descripcion')}>
        <Button variant="ghost" size="sm" onClick={() => setEstado({})}>
          <RotateCcw />
          {t('checklist.reiniciar')}
        </Button>
      </PageHeader>

      {/* ── Progreso ────────────────────────────────────────── */}
      <Card className="mb-5 animate-rise">
        <CardContent className="p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium">
              {t('checklist.progreso', { hechos, total: ITEMS_BPA.length })}
            </p>
            <p className="nums text-sm text-muted">{progreso.toFixed(0)}%</p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={hechos}
            aria-valuemin={0}
            aria-valuemax={ITEMS_BPA.length}
            className="h-2 overflow-hidden rounded-full bg-cream-200"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Ítems ───────────────────────────────────────────── */}
      <ul className="space-y-2">
        {ITEMS_BPA.map((item, indice) => {
          const marcado = Boolean(estado[item])
          return (
            <li key={item} className="animate-rise" style={{ animationDelay: `${indice * 35}ms` }}>
              <button
                type="button"
                onClick={() => alternar(item)}
                aria-pressed={marcado}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-(--radius-card) border p-4 text-left transition-colors duration-150',
                  marcado
                    ? 'border-pine-200 bg-pine-100/50'
                    : 'border-border bg-surface hover:border-border-strong',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150',
                    marcado
                      ? 'border-primary bg-primary text-cream-50'
                      : 'border-border-strong bg-surface',
                  )}
                  aria-hidden
                >
                  {marcado && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span
                  className={cn(
                    'text-sm leading-snug',
                    marcado ? 'text-pine-700' : 'text-foreground',
                  )}
                >
                  {t(`checklist.items.${item}`)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-5 text-xs leading-relaxed text-faint">{t('checklist.nota')}</p>
    </div>
  )
}
