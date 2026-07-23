export interface RegistroTrazabilidad {
  id: string
  tipo_evento: string
  device_id: string | null
  usuario_id: string | null
  payload: Record<string, unknown>
  timestamp: string
  previous_hash: string
  hash_actual: string
}

export interface VerificacionIntegridad {
  integra: boolean
  total_registros: number
  primer_registro_inconsistente: number | null
}
