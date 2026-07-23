import { create } from 'zustand'

import { setAccessToken } from '@/infrastructure/api/apiClient'
import { decodificarSesion, login as loginService } from '@/infrastructure/auth/authService'
import type { SesionUsuario } from '@/infrastructure/auth/authService'
import { limpiarSesionActiva, marcarSesionActiva } from '@/infrastructure/auth/avisoSesion'
import { MODO_DEMO } from '@/infrastructure/demo/modoDemo'

interface AuthState {
  usuario: SesionUsuario | null
  autenticado: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
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

  login: async (email, password) => {
    const token = await loginService(email, password)
    setAccessToken(token)
    marcarSesionActiva()
    if (MODO_DEMO) sessionStorage.setItem(CLAVE_TOKEN_DEMO, token)
    set({ usuario: decodificarSesion(token), autenticado: true })
  },

  logout: () => {
    setAccessToken(null)
    limpiarSesionActiva()
    if (MODO_DEMO) sessionStorage.removeItem(CLAVE_TOKEN_DEMO)
    set({ usuario: null, autenticado: false })
  },
}))
