export interface Dispositivo {
  id: string
  nombre: string | null
  ubicacion: string | null
  estado_conectividad: string
  activo: boolean
  firmware_version: string
  motivo_baja: string | null
  descripcion_baja: string | null
  dado_de_baja_en: string | null
  reemplaza_a_device_id: string | null
}

export const MOTIVOS_BAJA = ['falla_hardware', 'mantenimiento', 'reemplazo', 'fin_de_servicio'] as const
export type MotivoBaja = (typeof MOTIVOS_BAJA)[number]
