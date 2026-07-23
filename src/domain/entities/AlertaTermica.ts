import type { NivelRiesgo } from '../value-objects/NivelRiesgo'

export interface AlertaTermica {
  id: string
  reading_id: string
  device_id: string
  nivel_riesgo: NivelRiesgo
  mensaje: string
  revisada: boolean
  revisada_por: string | null
  created_at: string | null
}

export interface AccionCorrectiva {
  id: string
  alert_id: string
  usuario_id: string
  descripcion: string
  created_at: string | null
}
