import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HardDrive, PowerOff } from 'lucide-react'

import { useDispositivos } from '@/application/hooks/useDispositivos'
import { MOTIVOS_BAJA, type Dispositivo, type MotivoBaja } from '@/domain/entities/Dispositivo'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import { Input, Label, NativeSelect, Textarea } from '../components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'

const FORM_INICIAL: { motivo: MotivoBaja; descripcion: string; deviceIdReemplazo: string } = {
  motivo: MOTIVOS_BAJA[0],
  descripcion: '',
  deviceIdReemplazo: '',
}

export function DispositivosPage() {
  const { t } = useTranslation()
  const { dispositivos, cargando, darDeBaja } = useDispositivos()

  const [dispositivoBaja, setDispositivoBaja] = useState<Dispositivo | null>(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const abrirBaja = (dispositivo: Dispositivo) => {
    setDispositivoBaja(dispositivo)
    setForm(FORM_INICIAL)
    setMensaje(null)
  }

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!dispositivoBaja) return
    setEnviando(true)
    setMensaje(null)
    const resultado = await darDeBaja(
      dispositivoBaja.id,
      form.motivo,
      form.descripcion,
      form.deviceIdReemplazo,
    )
    setEnviando(false)

    if (resultado === 'ok') {
      setMensaje({ tipo: 'ok', texto: t('dispositivos.bajaExitosa') })
      setTimeout(() => setDispositivoBaja(null), 1000)
    } else {
      setMensaje({ tipo: 'error', texto: t('comunes.error') })
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.seccionAdministracion')}
        titulo={t('dispositivos.titulo')}
        descripcion={t('dispositivos.descripcion')}
      />

      <div className="animate-rise">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('dispositivos.id')}</TableHead>
              <TableHead>{t('dispositivos.conectividad')}</TableHead>
              <TableHead>{t('dispositivos.firmware')}</TableHead>
              <TableHead>{t('dispositivos.estado')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableEmpty colSpan={5}>{t('app.cargando')}</TableEmpty>
            ) : dispositivos.length === 0 ? (
              <TableEmpty colSpan={5}>
                <span className="inline-flex flex-col items-center gap-2">
                  <HardDrive className="size-5 text-faint" />
                  {t('dispositivos.sinDispositivos')}
                </span>
              </TableEmpty>
            ) : (
              dispositivos.map((dispositivo) => (
                <TableRow key={dispositivo.id}>
                  <TableCell className="font-medium">{dispositivo.id}</TableCell>
                  <TableCell>
                    <Badge variant={dispositivo.estado_conectividad === 'online' ? 'ok' : 'neutral'}>
                      {dispositivo.estado_conectividad}
                    </Badge>
                  </TableCell>
                  <TableCell className="nums text-[13px] text-muted">
                    {dispositivo.firmware_version}
                  </TableCell>
                  <TableCell>
                    {dispositivo.activo ? (
                      <Badge variant="ok">{t('dispositivos.activo')}</Badge>
                    ) : (
                      <Badge variant="critical" title={dispositivo.motivo_baja ?? undefined}>
                        {t('dispositivos.inactivo')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {dispositivo.activo && (
                      <Button variant="secondary" size="sm" onClick={() => abrirBaja(dispositivo)}>
                        <PowerOff />
                        {t('dispositivos.darDeBaja')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dispositivoBaja !== null} onOpenChange={(abierto) => !abierto && setDispositivoBaja(null)}>
        <DialogContent>
          <DialogTitle>{t('dispositivos.darDeBaja')}</DialogTitle>
          <DialogDescription>
            {t('dispositivos.confirmarBaja', { id: dispositivoBaja?.id ?? '' })}
          </DialogDescription>
          <form onSubmit={enviar} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="d-motivo">{t('dispositivos.motivo')}</Label>
              <NativeSelect
                id="d-motivo"
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value as MotivoBaja })}
              >
                {MOTIVOS_BAJA.map((motivo) => (
                  <option key={motivo} value={motivo}>
                    {t(`dispositivos.motivos.${motivo}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="d-descripcion">{t('dispositivos.descripcionBaja')}</Label>
              <Textarea
                id="d-descripcion"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="d-reemplazo">{t('dispositivos.deviceIdReemplazo')}</Label>
              <Input
                id="d-reemplazo"
                value={form.deviceIdReemplazo}
                onChange={(e) => setForm({ ...form, deviceIdReemplazo: e.target.value })}
                placeholder={t('dispositivos.deviceIdReemplazoPlaceholder')}
              />
            </div>

            {mensaje && (
              <p
                role={mensaje.tipo === 'error' ? 'alert' : 'status'}
                className={
                  mensaje.tipo === 'ok'
                    ? 'rounded-(--radius-field) bg-pine-100 px-3 py-2 text-[13px] text-pine-700'
                    : 'rounded-(--radius-field) bg-clay-100 px-3 py-2 text-[13px] text-clay-700'
                }
              >
                {mensaje.texto}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setDispositivoBaja(null)} disabled={enviando}>
                {t('usuarios.cancelar')}
              </Button>
              <Button type="submit" variant="danger" disabled={enviando}>
                {enviando ? t('dispositivos.procesando') : t('dispositivos.confirmar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
