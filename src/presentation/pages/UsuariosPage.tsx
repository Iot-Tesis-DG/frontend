import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, Users } from 'lucide-react'

import { useUsuarios } from '@/application/hooks/useUsuarios'
import { ROLES, type Rol } from '@/domain/value-objects/Rol'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import { Input, Label, NativeSelect } from '../components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'

const VARIANTE_POR_ROL = {
  administrador: 'critical',
  farmaceutico: 'ok',
  tecnico: 'neutral',
} as const

const FORM_INICIAL = { nombre: '', email: '', password: '', rol: 'tecnico' as Rol }

export function UsuariosPage() {
  const { t } = useTranslation()
  const { usuarios, cargando, crear } = useUsuarios()

  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [creando, setCreando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreando(true)
    setMensaje(null)
    const resultado = await crear(form.nombre, form.email, form.password, form.rol)
    setCreando(false)

    if (resultado === 'ok') {
      setMensaje({ tipo: 'ok', texto: t('usuarios.creado') })
      setTimeout(() => {
        setDialogoAbierto(false)
        setForm(FORM_INICIAL)
        setMensaje(null)
      }, 1000)
    } else if (resultado === 'duplicado') {
      setMensaje({ tipo: 'error', texto: t('usuarios.errorDuplicado') })
    } else {
      setMensaje({ tipo: 'error', texto: t('comunes.error') })
    }
  }

  return (
    <div>
      <PageHeader eyebrow={t('nav.seccionAdministracion')} titulo={t('usuarios.titulo')} descripcion={t('usuarios.descripcion')}>
        <Button onClick={() => setDialogoAbierto(true)}>
          <UserPlus />
          {t('usuarios.nuevo')}
        </Button>
      </PageHeader>

      <div className="animate-rise">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('usuarios.nombre')}</TableHead>
              <TableHead>{t('usuarios.email')}</TableHead>
              <TableHead>{t('usuarios.rol')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableEmpty colSpan={3}>{t('app.cargando')}</TableEmpty>
            ) : usuarios.length === 0 ? (
              <TableEmpty colSpan={3}>
                <span className="inline-flex flex-col items-center gap-2">
                  <Users className="size-5 text-faint" />
                  {t('usuarios.sinUsuarios')}
                </span>
              </TableEmpty>
            ) : (
              usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.nombre}</TableCell>
                  <TableCell className="text-muted">{usuario.email}</TableCell>
                  <TableCell>
                    <Badge variant={VARIANTE_POR_ROL[usuario.rol]}>
                      {t(`roles.${usuario.rol}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Diálogo de creación ─────────────────────────────── */}
      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent>
          <DialogTitle>{t('usuarios.nuevo')}</DialogTitle>
          <DialogDescription>{t('usuarios.descripcion')}</DialogDescription>
          <form onSubmit={enviar} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="u-nombre">{t('usuarios.nombre')}</Label>
              <Input
                id="u-nombre"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="u-email">{t('usuarios.email')}</Label>
              <Input
                id="u-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="u-password">{t('usuarios.password')}</Label>
              <Input
                id="u-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="u-rol">{t('usuarios.rol')}</Label>
              <NativeSelect
                id="u-rol"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
              >
                {ROLES.map((rol) => (
                  <option key={rol} value={rol}>
                    {t(`roles.${rol}`)}
                  </option>
                ))}
              </NativeSelect>
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
              <Button variant="ghost" onClick={() => setDialogoAbierto(false)} disabled={creando}>
                {t('usuarios.cancelar')}
              </Button>
              <Button type="submit" disabled={creando}>
                {creando ? t('usuarios.creando') : t('usuarios.crear')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
