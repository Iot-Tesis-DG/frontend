import { apiClient } from '../api/apiClient'
import type { Rol } from '@/domain/value-objects/Rol'

interface TokenResponse {
  access_token: string
  token_type: string
}

export interface SesionUsuario {
  id: string
  email: string
  rol: Rol
}

export async function login(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password })
  const { data } = await apiClient.post<TokenResponse>('/api/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data.access_token
}

/** Decodifica el payload del JWT (sin verificar firma: eso lo hace el backend). */
export function decodificarSesion(token: string): SesionUsuario {
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  return { id: payload.sub, email: payload.email, rol: payload.rol }
}
