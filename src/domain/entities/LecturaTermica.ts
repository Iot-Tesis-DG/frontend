import type { NivelRiesgo } from '../value-objects/NivelRiesgo'

/** Origen real de la clasificación (AIV-04): quién decidió el nivel de riesgo. */
export type OrigenClasificacion =
  | 'random_forest'
  | 'salvaguarda_determinista'
  | 'dato_insuficiente'
  | 'fallo_sensor'

/** Estado real de la inferencia (AIV-07): distingue "no hubo inferencia" de
 * "el modelo decidió con confianza matemática 0". */
export type EstadoInferencia = 'completada' | 'omitida' | 'fallida' | 'modelo_no_disponible'
export type EstadoSensor = 'valido' | 'ausente' | 'invalido' | 'fisicamente_imposible'

export interface LecturaTermica {
  id: string | null
  device_id: string
  timestamp: string
  temperatura_ambiental: number | null
  humedad_ambiental: number | null
  temperatura_interna: number | null
  apertura_refrigerador: boolean
  estado_conectividad: string
  nivel_riesgo: NivelRiesgo | null
  /** null cuando no hubo inferencia real (AIV-07) — nunca 0 como centinela. */
  confianza_ia: number | null
  modelo_version: string | null
  model_version?: string | null
  origen_clasificacion: OrigenClasificacion | null
  estado_inferencia: EstadoInferencia | null
  motivo_no_inferencia: string | null
  estado_sensores?: Record<string, EstadoSensor> | null
}
