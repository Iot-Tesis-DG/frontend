import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellOff, CheckCheck, ClipboardPen } from 'lucide-react'

import { useAlertas, type FiltroRevision } from '@/application/hooks/useAlertas'
import { useAuthStore } from '@/application/stores/authStore'
import { tienePermiso } from '@/domain/value-objects/Rol'
import type { AlertaTermica } from '@/domain/entities/AlertaTermica'
import { cn } from '@/lib/utils'
import { PageHeader } from '../components/PageHeader'
import { RiskBadge } from '../components/RiskBadge'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog'
import { Textarea } from '../components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'

const FILTROS: FiltroRevision[] = ['pendientes', 'revisadas', 'todas']

export function AlertasPage() {
  const { t } = useTranslation()
  const usuario = useAuthStore((s) => s.usuario)
  const { alertas, cargando, filtro, setFiltro, marcarRevisada, registrarAccionCorrectiva } =
    useAlertas()

  const [alertaSeleccionada, setAlertaSeleccionada] = useState<AlertaTermica | null>(null)
  const [descripcionAccion, setDescripcionAccion] = useState('')
  const [guardandoAccion, setGuardandoAccion] = useState(false)
  const [mensajeExito, setMensajeExito] = useState(false)

  const puedeRevisar = usuario !== null && tienePermiso(usuario.rol, ['farmaceutico'])

  const guardarAccion = async () => {
    if (!alertaSeleccionada || descripcionAccion.trim().length === 0) return
    setGuardandoAccion(true)
    try {
      await registrarAccionCorrectiva(alertaSeleccionada.id, descripcionAccion.trim())
      setMensajeExito(true)
      setTimeout(() => {
        setAlertaSeleccionada(null)
        setDescripcionAccion('')
        setMensajeExito(false)
      }, 1200)
    } finally {
      setGuardandoAccion(false)
    }
  }

  return (
    <div>
      <PageHeader eyebrow={t('nav.seccionOperacion')} titulo={t('alertas.titulo')} descripcion={t('alertas.descripcion')}>
        <div className="inline-flex rounded-full border border-border-strong bg-surface p-0.5">
          {FILTROS.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setFiltro(opcion)}
              aria-pressed={filtro === opcion}
              className={cn(
                'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                filtro === opcion
                  ? 'bg-primary text-cream-50'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {t(`alertas.${opcion}`)}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="animate-rise">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('alertas.fecha')}</TableHead>
              <TableHead>{t('historial.dispositivo')}</TableHead>
              <TableHead>{t('historial.riesgo')}</TableHead>
              <TableHead>{t('alertas.mensaje')}</TableHead>
              <TableHead>{t('alertas.estado')}</TableHead>
              <TableHead className="text-right">{t('alertas.acciones')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableEmpty colSpan={6}>{t('app.cargando')}</TableEmpty>
            ) : alertas.length === 0 ? (
              <TableEmpty colSpan={6}>
                <span className="inline-flex flex-col items-center gap-2">
                  <BellOff className="size-5 text-faint" />
                  {t('alertas.sinAlertas')}
                </span>
              </TableEmpty>
            ) : (
              alertas.map((alerta) => (
                <TableRow key={alerta.id}>
                  <TableCell className="nums text-[13px]">
                    {alerta.created_at ? new Date(alerta.created_at).toLocaleString('es-PE') : '—'}
                  </TableCell>
                  <TableCell className="text-[13px]">{alerta.device_id}</TableCell>
                  <TableCell>
                    <RiskBadge nivel={alerta.nivel_riesgo} />
                  </TableCell>
                  <TableCell className="max-w-72 text-[13px] text-muted">{alerta.mensaje}</TableCell>
                  <TableCell>
                    {alerta.revisada ? (
                      <Badge variant="ok">{t('alertas.revisada')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('alertas.pendientes')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1.5">
                      {!alerta.revisada && puedeRevisar && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void marcarRevisada(alerta.id)}
                          title={t('alertas.revisar')}
                        >
                          <CheckCheck />
                          {t('alertas.revisar')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAlertaSeleccionada(alerta)}
                        title={t('alertas.registrarAccion')}
                      >
                        <ClipboardPen />
                        {t('alertas.accionCorrectiva')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Diálogo de acción correctiva ────────────────────── */}
      <Dialog
        open={alertaSeleccionada !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setAlertaSeleccionada(null)
            setDescripcionAccion('')
            setMensajeExito(false)
          }
        }}
      >
        <DialogContent>
          <DialogTitle>{t('alertas.registrarAccion')}</DialogTitle>
          <DialogDescription>{alertaSeleccionada?.mensaje}</DialogDescription>
          <div className="mt-4 space-y-3">
            <Textarea
              value={descripcionAccion}
              onChange={(e) => setDescripcionAccion(e.target.value)}
              placeholder={t('alertas.descripcionAccion')}
              maxLength={2000}
            />
            {mensajeExito && (
              <p className="rounded-(--radius-field) bg-pine-100 px-3 py-2 text-[13px] text-pine-700">
                {t('alertas.accionRegistrada')}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setAlertaSeleccionada(null)}
                disabled={guardandoAccion}
              >
                {t('comunes.cancelar')}
              </Button>
              <Button
                onClick={() => void guardarAccion()}
                disabled={guardandoAccion || descripcionAccion.trim().length === 0}
              >
                {guardandoAccion ? t('alertas.guardando') : t('alertas.guardarAccion')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
