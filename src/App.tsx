import { Suspense, lazy, useEffect, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'

import { setOnSesionExpirada } from '@/infrastructure/api/apiClient'
import { marcarSesionExpirada } from '@/infrastructure/auth/avisoSesion'
import { useAuthStore } from '@/application/stores/authStore'
import { AppLayout } from '@/presentation/layouts/AppLayout'
import { ErrorBoundary } from '@/presentation/components/ErrorBoundary'
import { PrivacyConsentModal } from '@/presentation/components/PrivacyConsentModal'
import { RequireAuth, RequireRoles } from '@/presentation/components/RouteGuards'
import { LoginPage } from '@/presentation/pages/LoginPage'

/**
 * Carga diferida por ruta (F-11). El dashboard arrastra ECharts (~600 KB), que
 * antes entraba en el paquete inicial y retrasaba incluso la pantalla de login.
 *
 * Las páginas exportan con nombre, así que hay que reempaquetarlas como
 * `default` para `React.lazy`.
 */
function diferida<T extends Record<string, ComponentType>>(
  cargar: () => Promise<T>,
  nombre: keyof T,
) {
  return lazy(async () => ({ default: (await cargar())[nombre] }))
}

const DashboardPage = diferida(() => import('@/presentation/pages/DashboardPage'), 'DashboardPage')
const HistorialPage = diferida(() => import('@/presentation/pages/HistorialPage'), 'HistorialPage')
const AlertasPage = diferida(() => import('@/presentation/pages/AlertasPage'), 'AlertasPage')
const TrazabilidadPage = diferida(
  () => import('@/presentation/pages/TrazabilidadPage'),
  'TrazabilidadPage',
)
const ChecklistBPAPage = diferida(
  () => import('@/presentation/pages/ChecklistBPAPage'),
  'ChecklistBPAPage',
)
const ReportesPage = diferida(() => import('@/presentation/pages/ReportesPage'), 'ReportesPage')
const MetricasIAPage = diferida(
  () => import('@/presentation/pages/MetricasIAPage'),
  'MetricasIAPage',
)
const AuditoriaPage = diferida(() => import('@/presentation/pages/AuditoriaPage'), 'AuditoriaPage')
const UsuariosPage = diferida(() => import('@/presentation/pages/UsuariosPage'), 'UsuariosPage')
const DispositivosPage = diferida(
  () => import('@/presentation/pages/DispositivosPage'),
  'DispositivosPage',
)
const FirmwarePage = diferida(() => import('@/presentation/pages/FirmwarePage'), 'FirmwarePage')

function Pagina({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="animate-fade p-8 text-sm text-muted">…</p>}>{children}</Suspense>
  )
}

function SesionExpiradaListener() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    setOnSesionExpirada(() => {
      marcarSesionExpirada()
      // El token ya fue rechazado por el backend: pedir su revocación solo
      // produciría otro 401.
      logout({ revocar: false })
      void navigate('/login', { replace: true })
    })
  }, [logout, navigate])

  return null
}

export function App() {
  return (
    // Envuelve el router entero: una excepción durante el render dejaba antes
    // la pantalla en blanco, sin indicio de si el monitoreo seguía activo.
    <ErrorBoundary>
      <BrowserRouter>
        <SesionExpiradaListener />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Pagina><DashboardPage /></Pagina>} />
              <Route path="/historial" element={<Pagina><HistorialPage /></Pagina>} />
              <Route path="/alertas" element={<Pagina><AlertasPage /></Pagina>} />
              <Route path="/trazabilidad" element={<Pagina><TrazabilidadPage /></Pagina>} />

              <Route element={<RequireRoles roles={['farmaceutico']} />}>
                <Route path="/checklist-bpa" element={<Pagina><ChecklistBPAPage /></Pagina>} />
                <Route path="/reportes" element={<Pagina><ReportesPage /></Pagina>} />
                <Route path="/metricas-ia" element={<Pagina><MetricasIAPage /></Pagina>} />
              </Route>

              <Route element={<RequireRoles roles={[]} />}>
                <Route path="/auditoria" element={<Pagina><AuditoriaPage /></Pagina>} />
                <Route path="/usuarios" element={<Pagina><UsuariosPage /></Pagina>} />
                <Route path="/dispositivos" element={<Pagina><DispositivosPage /></Pagina>} />
                <Route path="/firmware" element={<Pagina><FirmwarePage /></Pagina>} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <PrivacyConsentModal />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
