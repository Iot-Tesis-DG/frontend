import type { Rol } from '../value-objects/Rol'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
}

export interface RegistroAuditoria {
  id: string
  usuario_id: string | null
  accion: string
  recurso: string
  detalle: Record<string, unknown> | null
  ip_origen: string | null
  created_at: string
}
