import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'

import { setOnSesionExpirada } from '@/infrastructure/api/apiClient'
import { marcarSesionExpirada } from '@/infrastructure/auth/avisoSesion'
import { useAuthStore } from '@/application/stores/authStore'
import { AppLayout } from '@/presentation/layouts/AppLayout'
import { PrivacyConsentModal } from '@/presentation/components/PrivacyConsentModal'
import { RequireAuth, RequireRoles } from '@/presentation/components/RouteGuards'
import { LoginPage } from '@/presentation/pages/LoginPage'
import { DashboardPage } from '@/presentation/pages/DashboardPage'
import { HistorialPage } from '@/presentation/pages/HistorialPage'
import { AlertasPage } from '@/presentation/pages/AlertasPage'
import { TrazabilidadPage } from '@/presentation/pages/TrazabilidadPage'
import { ChecklistBPAPage } from '@/presentation/pages/ChecklistBPAPage'
import { ReportesPage } from '@/presentation/pages/ReportesPage'
import { AuditoriaPage } from '@/presentation/pages/AuditoriaPage'
import { UsuariosPage } from '@/presentation/pages/UsuariosPage'
import { DispositivosPage } from '@/presentation/pages/DispositivosPage'
import { FirmwarePage } from '@/presentation/pages/FirmwarePage'

function SesionExpiradaListener() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    setOnSesionExpirada(() => {
      marcarSesionExpirada()
      logout()
      void navigate('/login', { replace: true })
    })
  }, [logout, navigate])

  return null
}

export function App() {
  return (
    <BrowserRouter>
      <SesionExpiradaListener />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/historial" element={<HistorialPage />} />
            <Route path="/alertas" element={<AlertasPage />} />
            <Route path="/trazabilidad" element={<TrazabilidadPage />} />

            <Route element={<RequireRoles roles={['farmaceutico']} />}>
              <Route path="/checklist-bpa" element={<ChecklistBPAPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
            </Route>

            <Route element={<RequireRoles roles={[]} />}>
              <Route path="/auditoria" element={<AuditoriaPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/dispositivos" element={<DispositivosPage />} />
              <Route path="/firmware" element={<FirmwarePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <PrivacyConsentModal />
    </BrowserRouter>
  )
}
