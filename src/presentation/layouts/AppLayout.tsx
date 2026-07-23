import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Activity,
  Bell,
  ClipboardCheck,
  DownloadCloud,
  FileText,
  FlaskConical,
  HardDrive,
  History,
  Link2,
  LogOut,
  Menu,
  ScrollText,
  Snowflake,
  Users,
  X,
} from 'lucide-react'

import { useAuthStore } from '@/application/stores/authStore'
import { tienePermiso, type Rol } from '@/domain/value-objects/Rol'
import { MODO_DEMO } from '@/infrastructure/demo/modoDemo'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

interface ItemNav {
  ruta: string
  icono: React.ComponentType<{ className?: string }>
  claveI18n: string
  roles: Rol[]
}

interface SeccionNav {
  claveI18n: string
  items: ItemNav[]
}

const SECCIONES: SeccionNav[] = [
  {
    claveI18n: 'nav.seccionOperacion',
    items: [
      { ruta: '/dashboard', icono: Activity, claveI18n: 'nav.dashboard', roles: ['farmaceutico', 'tecnico'] },
      { ruta: '/historial', icono: History, claveI18n: 'nav.historial', roles: ['farmaceutico', 'tecnico'] },
      { ruta: '/alertas', icono: Bell, claveI18n: 'nav.alertas', roles: ['farmaceutico', 'tecnico'] },
    ],
  },
  {
    claveI18n: 'nav.seccionCumplimiento',
    items: [
      { ruta: '/trazabilidad', icono: Link2, claveI18n: 'nav.trazabilidad', roles: ['farmaceutico', 'tecnico'] },
      { ruta: '/checklist-bpa', icono: ClipboardCheck, claveI18n: 'nav.checklist', roles: ['farmaceutico'] },
      { ruta: '/reportes', icono: FileText, claveI18n: 'nav.reportes', roles: ['farmaceutico'] },
    ],
  },
  {
    claveI18n: 'nav.seccionAdministracion',
    items: [
      { ruta: '/auditoria', icono: ScrollText, claveI18n: 'nav.auditoria', roles: [] },
      { ruta: '/usuarios', icono: Users, claveI18n: 'nav.usuarios', roles: [] },
      { ruta: '/dispositivos', icono: HardDrive, claveI18n: 'nav.dispositivos', roles: [] },
      { ruta: '/firmware', icono: DownloadCloud, claveI18n: 'nav.firmware', roles: [] },
    ],
  },
]

function MarcaApp() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-cream-50 shadow-sm shadow-pine-900/25 ring-1 ring-pine-800/40">
        <Snowflake className="size-4.5" />
      </span>
      <div className="leading-tight">
        <p className="font-display text-[15px] font-semibold tracking-tight">{t('app.nombre')}</p>
        <p className="text-[11px] text-faint">{t('app.subtitulo')}</p>
      </div>
    </div>
  )
}

function BadgeDemo({ className }: { className?: string }) {
  const { t } = useTranslation()
  if (!MODO_DEMO) return null
  return (
    <span
      title={t('demo.descripcionBadge')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-honey-600/25 bg-honey-100 px-2.5 py-1 text-[11px] font-semibold text-honey-700',
        className,
      )}
    >
      <FlaskConical className="size-3" />
      {t('demo.badge')}
    </span>
  )
}

/** Contenido del sidebar, compartido entre escritorio y el drawer móvil. */
function ContenidoSidebar({ alNavegar }: { alNavegar?: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)
  const logout = useAuthStore((s) => s.logout)

  if (!usuario) return null

  const cerrarSesion = () => {
    logout()
    void navigate('/login', { replace: true })
  }

  return (
    <>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {SECCIONES.map((seccion) => {
          const visibles = seccion.items.filter((item) => tienePermiso(usuario.rol, item.roles))
          if (visibles.length === 0) return null
          return (
            <div key={seccion.claveI18n}>
              <p className="eyebrow mb-1.5 flex items-center gap-2 px-2">
                {t(seccion.claveI18n)}
                <span className="h-px flex-1 bg-border/80" aria-hidden />
              </p>
              <ul className="space-y-0.5">
                {visibles.map((item) => (
                  <li key={item.ruta}>
                    <NavLink
                      to={item.ruta}
                      onClick={alNavegar}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-[color,background-color,transform] duration-150',
                          isActive
                            ? 'bg-primary-tint text-pine-700 shadow-[inset_0_0_0_1px_rgb(46_92_69_/_0.12)]'
                            : 'text-muted hover:translate-x-0.5 hover:bg-cream-200/70 hover:text-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Barra de tinta que marca la sección activa */}
                          <span
                            aria-hidden
                            className={cn(
                              'absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity duration-150',
                              isActive ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <item.icono
                            className={cn(
                              'size-4 transition-colors',
                              isActive ? 'text-pine-600' : 'text-faint group-hover:text-muted',
                            )}
                          />
                          {t(item.claveI18n)}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-border px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-border/80 bg-surface px-2.5 py-2 shadow-(--shadow-card)">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pine-200 font-display text-sm font-semibold text-pine-700 ring-2 ring-pine-100">
            {usuario.email.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium text-foreground">{usuario.email}</p>
            <p className="text-[11px] text-pine-600">{t(`roles.${usuario.rol}`)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={cerrarSesion}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted transition-colors duration-150 hover:bg-clay-100 hover:text-clay-700"
        >
          <LogOut className="size-4" />
          {t('nav.cerrarSesion')}
        </button>
      </div>
    </>
  )
}

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const usuario = useAuthStore((s) => s.usuario)
  const [drawerAbierto, setDrawerAbierto] = useState(false)

  if (!usuario) return null

  const fechaHoy = new Date().toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex min-h-dvh">
      {/* ── Sidebar de escritorio ────────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-gradient-to-b from-cream-100/90 to-cream-100/50 lg:flex">
        <div className="px-5 pb-5 pt-6">
          <MarcaApp />
        </div>
        <ContenidoSidebar />
      </aside>

      {/* ── Drawer móvil ─────────────────────────────────────── */}
      <DialogPrimitive.Root open={drawerAbierto} onOpenChange={setDrawerAbierto}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-[2px] data-[state=open]:animate-fade lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-(--shadow-raised) data-[state=open]:animate-(--animate-drawer) lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">{t('app.nombre')}</DialogPrimitive.Title>
            <div className="flex items-center justify-between px-5 pb-5 pt-6">
              <MarcaApp />
              <DialogPrimitive.Close
                aria-label={t('comunes.cerrar')}
                className="rounded-md p-1.5 text-muted transition-colors hover:bg-cream-200 hover:text-foreground"
              >
                <X className="size-4.5" />
              </DialogPrimitive.Close>
            </div>
            <ContenidoSidebar alNavegar={() => setDrawerAbierto(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>

        {/* ── Contenido ──────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm sm:px-6">
            <DialogPrimitive.Trigger
              aria-label={t('nav.abrirMenu')}
              className="-ml-1 rounded-md p-2 text-muted transition-colors hover:bg-cream-200 hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </DialogPrimitive.Trigger>

            <span className="flex items-center gap-2 lg:hidden">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-cream-50">
                <Snowflake className="size-3.5" />
              </span>
              <span className="font-display text-sm font-semibold tracking-tight">
                {t('app.nombre')}
              </span>
            </span>

            <p className="hidden font-display text-[13px] italic text-faint first-letter:uppercase lg:block">
              {fechaHoy}
            </p>

            <div className="ml-auto flex items-center gap-2.5">
              <BadgeDemo className="hidden sm:inline-flex" />
              <LanguageSwitcher />
            </div>
          </header>

          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {/* Tope de ancho: en monitores muy anchos el contenido no se estira sin fin */}
            <div className="mx-auto w-full max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
      </DialogPrimitive.Root>
    </div>
  )
}
