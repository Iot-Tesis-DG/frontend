import { create } from 'zustand'

import { apiClient, setAccessToken } from '@/infrastructure/api/apiClient'
import { decodificarSesion, login as loginService } from '@/infrastructure/auth/authService'
import type { SesionUsuario } from '@/infrastructure/auth/authService'
import { limpiarSesionActiva, marcarSesionActiva } from '@/infrastructure/auth/avisoSesion'
import { MODO_DEMO } from '@/infrastructure/demo/modoDemo'

interface AuthState {
  usuario: SesionUsuario | null
  autenticado: boolean
  requierePrivacidad: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  aceptarPrivacidad: () => Promise<void>
  rechazarPrivacidad: () => Promise<void>
}

const CLAVE_TOKEN_DEMO = 'cf_demo_token'

/**
 * Solo en modo demo la sesión sobrevive a la recarga (el token es falso,
 * sin valor real). En producción el JWT vive únicamente en memoria.
 */
function restaurarSesionDemo(): SesionUsuario | null {
  if (!MODO_DEMO) return null
  const token = sessionStorage.getItem(CLAVE_TOKEN_DEMO)
  if (!token) return null
  setAccessToken(token)
  return decodificarSesion(token)
}

const sesionRestaurada = restaurarSesionDemo()

/**
 * Estado de sesión SOLO en memoria (sin persist): el stack prohíbe
 * localStorage para el JWT como mitigación de XSS (OWASP WSTG).
 */
export const useAuthStore = create<AuthState>((set) => ({
  usuario: sesionRestaurada,
  autenticado: sesionRestaurada !== null,
  requierePrivacidad: false,

  login: async (email, password) => {
    const { accessToken, requierePrivacidad } = await loginService(email, password)
    setAccessToken(accessToken)
    marcarSesionActiva()
    if (MODO_DEMO) sessionStorage.setItem(CLAVE_TOKEN_DEMO, accessToken)
    set({ usuario: decodificarSesion(accessToken), autenticado: true, requierePrivacidad })
  },

  logout: () => {
    setAccessToken(null)
    limpiarSesionActiva()
    if (MODO_DEMO) sessionStorage.removeItem(CLAVE_TOKEN_DEMO)
    set({ usuario: null, autenticado: false, requierePrivacidad: false })
  },

  aceptarPrivacidad: async () => {
    await apiClient.post('/api/auth/privacidad/aceptar')
    set({ requierePrivacidad: false })
  },

  rechazarPrivacidad: async () => {
    try {
      await apiClient.post('/api/auth/privacidad/rechazar')
    } catch {
      // El backend responde 401 intencionalmente (revoca el token): esperado.
    }
  },
}))
