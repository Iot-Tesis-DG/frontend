import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellOff, CheckCheck, ClipboardPen } from 'lucide-react'

import { useAlertas, type FiltroEstado } from '@/application/hooks/useAlertas'
import { useAuthStore } from '@/application/stores/authStore'
import { tienePermiso } from '@/domain/value-objects/Rol'
import type { EstadoAlerta } from '@/domain/value-objects/EstadoAlerta'
import type { AlertaTermica } from '@/domain/entities/AlertaTermica'
import { fechaHora } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { rangoPagina } from '@/lib/paginacion'
import { Paginacion } from '../components/Paginacion'
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
import { Label, Textarea } from '../components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'

// HU-23: los tabs de filtro siguen la máquina de estados, no un booleano.
const FILTROS: FiltroEstado[] = ['pendiente', 'reconocida', 'atendida', 'todas']

const VARIANTE_POR_ESTADO: Record<EstadoAlerta, 'outline' | 'warn' | 'ok'> = {
  pendiente: 'outline',
  reconocida: 'warn',
  atendida: 'ok',
}

export function AlertasPage() {
  const { t } = useTranslation()
  const usuario = useAuthStore((s) => s.usuario)
  const { alertas, cargando, filtro, setFiltro, reconocerAlerta, registrarAccionCorrectiva } =
    useAlertas()
  const [pagina, setPagina] = useState(1)
  // Solo se pinta la página visible: estas listas crecen sin techo.
  const visibles = useMemo(() => alertas.slice(...rangoPagina(pagina)), [alertas, pagina])

  const [alertaSeleccionada, setAlertaSeleccionada] = useState<AlertaTermica | null>(null)
  const [descripcionAccion, setDescripcionAccion] = useState('')
  const [guardandoAccion, setGuardandoAccion] = useState(false)
  const [mensajeExito, setMensajeExito] = useState(false)
  // HU-27 Escenario 2: la alerta pudo cambiar de estado entre que se cargó
  // la lista y este click (otro usuario la atendió primero).
  const [conflictoAccion, setConflictoAccion] = useState(false)
  const [conflictoReconocer, setConflictoReconocer] = useState<string | null>(null)

  // HU-23/HU-41: reconocer (PENDIENTE -> RECONOCIDA) es exclusivo del
  // farmacéutico, igual que ya exige `require_roles(Rol.FARMACEUTICO)` en el
  // backend. Registrar una acción correctiva la permiten farmacéutico y
  // técnico. AUDITOR no aparece en ninguna de las dos listas: es de solo
  // lectura, así que ambos botones quedan ocultos para ese rol.
  const puedeReconocer = usuario !== null && tienePermiso(usuario.rol, ['farmaceutico'])
  const puedeRegistrarAccion =
    usuario !== null && tienePermiso(usuario.rol, ['farmaceutico', 'tecnico'])

  const guardarAccion = async () => {
    if (!alertaSeleccionada || descripcionAccion.trim().length === 0) return
    setGuardandoAccion(true)
    setConflictoAccion(false)
    try {
      const resultado = await registrarAccionCorrectiva(alertaSeleccionada.id, descripcionAccion.trim())
      if (resultado === 'ok') {
        setMensajeExito(true)
        setTimeout(() => {
          setAlertaSeleccionada(null)
          setDescripcionAccion('')
          setMensajeExito(false)
        }, 1200)
      } else if (resultado === 'conflicto') {
        // HU-27 Escenario 2: otro usuario ya atendió esta alerta. La lista
        // ya se refrescó (dentro del hook); aquí solo se informa por qué
        // este envío en particular no se aplicó.
        setConflictoAccion(true)
      }
    } finally {
      setGuardandoAccion(false)
    }
  }

  const reconocer = async (alertaId: string) => {
    setConflictoReconocer(null)
    const resultado = await reconocerAlerta(alertaId)
    if (resultado === 'conflicto') setConflictoReconocer(alertaId)
  }

  return (
    <div>
      <PageHeader eyebrow={t('nav.seccionOperacion')} titulo={t('alertas.titulo')} descripcion={t('alertas.descripcion')}>
        <div
          role="group"
          aria-label={t('alertas.filtroEstado')}
          className="inline-flex rounded-full border border-border-strong bg-surface p-0.5"
        >
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
              {t(`alertas.filtro.${opcion}`)}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="animate-rise">
        <Table titulo={t('alertas.titulo')} cargando={cargando}>
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
              visibles.map((alerta) => (
                <TableRow key={alerta.id}>
                  <TableCell className="nums text-[13px]">
                    {fechaHora(alerta.created_at)}
                  </TableCell>
                  <TableCell className="text-[13px]">{alerta.device_id}</TableCell>
                  <TableCell>
                    <RiskBadge nivel={alerta.nivel_riesgo} />
                  </TableCell>
                  <TableCell className="max-w-72 text-[13px] text-muted">{alerta.mensaje}</TableCell>
                  <TableCell>
                    <Badge variant={VARIANTE_POR_ESTADO[alerta.estado]}>
                      {t(`alertas.estadoAlerta.${alerta.estado}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-col items-end gap-1">
                    <div className="inline-flex gap-1.5">
                      {alerta.estado === 'pendiente' && puedeReconocer && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void reconocer(alerta.id)}
                          title={t('alertas.reconocer')}
                        >
                          <CheckCheck />
                          {t('alertas.reconocer')}
                        </Button>
                      )}
                      {alerta.estado !== 'atendida' && puedeRegistrarAccion && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAlertaSeleccionada(alerta)}
                          title={t('alertas.registrarAccion')}
                        >
                          <ClipboardPen />
                          {t('alertas.accionCorrectiva')}
                        </Button>
                      )}
                    </div>
                    {conflictoReconocer === alerta.id && (
                      <p role="alert" className="text-xs text-clay-700">
                        {t('alertas.conflictoEstado')}
                      </p>
                    )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Paginacion total={alertas.length} pagina={pagina} onCambiar={setPagina} />
      </div>

      {/* ── Diálogo de acción correctiva ────────────────────── */}
      <Dialog
        open={alertaSeleccionada !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setAlertaSeleccionada(null)
            setDescripcionAccion('')
            setMensajeExito(false)
            setConflictoAccion(false)
          }
        }}
      >
        <DialogContent>
          <DialogTitle>{t('alertas.registrarAccion')}</DialogTitle>
          <DialogDescription>{alertaSeleccionada?.mensaje}</DialogDescription>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="accion-descripcion">{t('alertas.etiquetaAccion')}</Label>
              <Textarea
                id="accion-descripcion"
                value={descripcionAccion}
                onChange={(e) => setDescripcionAccion(e.target.value)}
                placeholder={t('alertas.descripcionAccionPlaceholder')}
                maxLength={2000}
                aria-describedby="accion-ayuda"
              />
              <p id="accion-ayuda" className="mt-1 text-xs text-faint">
                {t('alertas.descripcionAccionAyuda')}
              </p>
            </div>
            {mensajeExito && (
              <p
                role="status"
                className="rounded-(--radius-field) bg-pine-100 px-3 py-2 text-[13px] text-pine-700"
              >
                {t('alertas.accionRegistrada')}
              </p>
            )}
            {conflictoAccion && (
              <p
                role="alert"
                className="rounded-(--radius-field) bg-clay-100 px-3 py-2 text-[13px] text-clay-700"
              >
                {t('alertas.conflictoEstado')}
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
