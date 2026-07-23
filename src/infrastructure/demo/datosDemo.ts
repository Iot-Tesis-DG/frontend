import type { AccionCorrectiva, AlertaTermica } from '@/domain/entities/AlertaTermica'
import type { LecturaTermica } from '@/domain/entities/LecturaTermica'
import type { RegistroTrazabilidad } from '@/domain/entities/RegistroTrazabilidad'
import type { RegistroAuditoria, Usuario } from '@/domain/entities/Usuario'
import type { NivelRiesgo } from '@/domain/value-objects/NivelRiesgo'
import type { Rol } from '@/domain/value-objects/Rol'

export const DISPOSITIVO_DEMO = 'FARM-01-CDL'

/* ── RNG determinista (mulberry32): mismos datos en cada carga ──── */
function crearRng(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HEX = '0123456789abcdef'
function hashFalso(rng: () => number): string {
  let h = ''
  for (let i = 0; i < 64; i++) h += HEX[Math.floor(rng() * 16)]
  return h
}

/** Mismo criterio que el clasificador del backend. */
function clasificar(temperatura: number): NivelRiesgo {
  if (temperatura < 2 || temperatura > 8) return 'excursion_critica'
  if (temperatura <= 2.5 || temperatura >= 7) return 'riesgo_preventivo'
  return 'normal'
}

export interface EstadoDemo {
  lecturas: LecturaTermica[]
  alertas: AlertaTermica[]
  acciones: AccionCorrectiva[]
  trazabilidad: RegistroTrazabilidad[]
  usuarios: Usuario[]
  auditoria: RegistroAuditoria[]
}

export const USUARIOS_DEMO: Usuario[] = [
  { id: 'u-01', nombre: 'Brenda Gamio Fernández', email: 'farmaceutico@demo.pe', rol: 'farmaceutico', is_active: true, motivo_desactivacion: null, desactivado_en: null },
  { id: 'u-02', nombre: 'Diego Soto Quispe', email: 'admin@demo.pe', rol: 'administrador', is_active: true, motivo_desactivacion: null, desactivado_en: null },
  { id: 'u-03', nombre: 'María Ccahuana Ríos', email: 'tecnico@demo.pe', rol: 'tecnico', is_active: true, motivo_desactivacion: null, desactivado_en: null },
  { id: 'u-04', nombre: 'Jorge Villanueva Paz', email: 'jorge.villanueva@demo.pe', rol: 'tecnico', is_active: true, motivo_desactivacion: null, desactivado_en: null },
]

const DIA_MS = 24 * 60 * 60 * 1000
const PASO_MS = 10 * 60 * 1000
const TOTAL_LECTURAS = 7 * 24 * 6 // una semana, cada 10 minutos

function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales
  return Math.round(valor * factor) / factor
}

function generarEstadoInicial(): EstadoDemo {
  const rng = crearRng(20260711)
  const ahora = Date.now()
  const inicio = ahora - (TOTAL_LECTURAS - 1) * PASO_MS

  // Episodios guionados para que el demo cuente una historia:
  // una excursión crítica ayer al mediodía y un aviso preventivo hace ~3 h.
  const excursionInicio = ahora - DIA_MS - 2 * 60 * 60 * 1000
  const excursionFin = excursionInicio + 50 * 60 * 1000
  const preventivoInicio = ahora - 3 * 60 * 60 * 1000
  const preventivoFin = preventivoInicio + 20 * 60 * 1000

  const lecturas: LecturaTermica[] = []
  let empujePuerta = 0

  for (let i = 0; i < TOTAL_LECTURAS; i++) {
    const ts = inicio + i * PASO_MS
    const faseDia = ((ts % DIA_MS) / DIA_MS) * Math.PI * 2
    const hora = new Date(ts).getHours()

    let puerta = hora >= 8 && hora <= 20 && rng() < 0.035
    if (puerta) empujePuerta = 0.9 + rng() * 0.7

    let interna = 4.9 + 0.6 * Math.sin(faseDia - Math.PI / 2) + (rng() - 0.5) * 0.5 + empujePuerta
    empujePuerta = Math.max(0, empujePuerta - 0.45)

    if (ts >= excursionInicio && ts <= excursionFin) {
      // Puerta mal cerrada: la temperatura escapa del rango y regresa.
      const avance = (ts - excursionInicio) / (excursionFin - excursionInicio)
      interna = 6.8 + Math.sin(avance * Math.PI) * 2.9 + (rng() - 0.5) * 0.2
      puerta = avance < 0.55
    } else if (ts >= preventivoInicio && ts <= preventivoFin) {
      interna = 7.1 + rng() * 0.5
      puerta = true
    }

    const ambiental = 21.5 + 3.6 * Math.sin(faseDia - Math.PI / 2) + (rng() - 0.5) * 1.2
    const humedad = 61 + 7 * Math.sin(faseDia + Math.PI / 3) + (rng() - 0.5) * 4

    lecturas.push({
      id: `lec-${String(i).padStart(4, '0')}`,
      device_id: DISPOSITIVO_DEMO,
      timestamp: new Date(ts).toISOString(),
      temperatura_interna: redondear(interna, 1),
      temperatura_ambiental: redondear(ambiental, 1),
      humedad_ambiental: redondear(humedad, 0),
      apertura_refrigerador: puerta,
      estado_conectividad: 'online',
      nivel_riesgo: clasificar(interna),
      confianza_ia: 0.9,
      modelo_version: 'demo-3.0.0',
      origen_clasificacion: 'random_forest',
      estado_inferencia: 'completada',
      motivo_no_inferencia: null,
    })
  }

  // Alertas: una por transición de riesgo (de menor a mayor severidad).
  const alertas: AlertaTermica[] = []
  let nivelPrevio: NivelRiesgo = 'normal'
  const severidad: Record<NivelRiesgo, number> = {
    normal: 0,
    riesgo_preventivo: 1,
    excursion_critica: 2,
  }
  for (const lectura of lecturas) {
    const nivel = lectura.nivel_riesgo ?? 'normal'
    if (severidad[nivel] > severidad[nivelPrevio]) {
      const temp = lectura.temperatura_interna?.toFixed(1)
      alertas.push({
        id: `al-${String(alertas.length + 1).padStart(3, '0')}`,
        reading_id: lectura.id ?? '',
        device_id: lectura.device_id,
        nivel_riesgo: nivel,
        mensaje:
          nivel === 'excursion_critica'
            ? `Temperatura interna ${temp} °C fuera del rango de conservación 2–8 °C`
            : `Temperatura interna ${temp} °C se acerca al límite del rango 2–8 °C`,
        revisada: false,
        revisada_por: null,
        created_at: lectura.timestamp,
      })
    }
    nivelPrevio = nivel
  }
  // Las alertas antiguas ya fueron atendidas; quedan pendientes las recientes
  // (incluida la excursión crítica de ayer, para que el demo tenga qué mostrar).
  const pendientesDesde = ahora - 30 * 60 * 60 * 1000
  for (const alerta of alertas) {
    if (new Date(alerta.created_at ?? 0).getTime() < pendientesDesde) {
      alerta.revisada = true
      alerta.revisada_por = 'u-01'
    }
  }

  const acciones: AccionCorrectiva[] = alertas
    .filter((a) => a.revisada && a.nivel_riesgo === 'excursion_critica')
    .map((a, i) => ({
      id: `ac-${String(i + 1).padStart(3, '0')}`,
      alert_id: a.id,
      usuario_id: 'u-01',
      descripcion:
        'Se verificó el cierre de la puerta, se reorganizaron los productos y se confirmó el retorno al rango 2–8 °C en menos de 30 minutos.',
      created_at: new Date(new Date(a.created_at ?? 0).getTime() + 25 * 60 * 1000).toISOString(),
    }))

  // Trazabilidad: cadena de sellos encadenados (hash previo → hash actual).
  type EventoBase = Omit<RegistroTrazabilidad, 'id' | 'previous_hash' | 'hash_actual'>
  const eventos: EventoBase[] = []
  for (let i = 0; i < lecturas.length; i += 24) {
    const l = lecturas[i]
    eventos.push({
      tipo_evento: 'LECTURA_TERMICA',
      device_id: l.device_id,
      usuario_id: null,
      payload: { temperatura_interna: l.temperatura_interna, nivel_riesgo: l.nivel_riesgo },
      timestamp: l.timestamp,
    })
  }
  for (const a of alertas) {
    eventos.push({
      tipo_evento: 'ALERTA_TERMICA',
      device_id: a.device_id,
      usuario_id: null,
      payload: { nivel_riesgo: a.nivel_riesgo, mensaje: a.mensaje },
      timestamp: a.created_at ?? new Date(ahora).toISOString(),
    })
  }
  for (const ac of acciones) {
    eventos.push({
      tipo_evento: 'ACCION_CORRECTIVA',
      device_id: DISPOSITIVO_DEMO,
      usuario_id: ac.usuario_id,
      payload: { descripcion: ac.descripcion },
      timestamp: ac.created_at ?? new Date(ahora).toISOString(),
    })
  }
  eventos.push(
    {
      tipo_evento: 'REPORTE_BPA',
      device_id: DISPOSITIVO_DEMO,
      usuario_id: 'u-01',
      payload: { periodo: 'últimos 30 días', formato: 'csv' },
      timestamp: new Date(ahora - 2 * DIA_MS).toISOString(),
    },
    {
      tipo_evento: 'CONECTIVIDAD',
      device_id: DISPOSITIVO_DEMO,
      usuario_id: null,
      payload: { estado: 'reconectado', latencia_ms: 210 },
      timestamp: new Date(ahora - 4 * DIA_MS).toISOString(),
    },
    {
      tipo_evento: 'AUDITORIA',
      device_id: null,
      usuario_id: 'u-02',
      payload: { accion: 'USUARIO_CREADO', recurso: '/api/usuarios' },
      timestamp: new Date(ahora - 5 * DIA_MS).toISOString(),
    },
  )
  eventos.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  let hashPrevio = '0'.repeat(64)
  const trazabilidad: RegistroTrazabilidad[] = eventos.map((evento, i) => {
    const hashActual = hashFalso(rng)
    const registro: RegistroTrazabilidad = {
      id: `tz-${String(i + 1).padStart(4, '0')}`,
      ...evento,
      previous_hash: hashPrevio,
      hash_actual: hashActual,
    }
    hashPrevio = hashActual
    return registro
  })

  const ipsDemo = ['181.65.203.44', '181.65.203.44', '38.25.16.102', '190.42.77.15']
  const plantillaAuditoria: Array<[string, string, string | null]> = [
    ['LOGIN_EXITOSO', '/api/auth/login', 'u-01'],
    ['ALERTA_REVISADA', '/api/alertas', 'u-01'],
    ['REPORTE_BPA_GENERADO', '/api/reportes/bpa', 'u-01'],
    ['LOGIN_EXITOSO', '/api/auth/login', 'u-03'],
    ['LOGIN_FALLIDO', '/api/auth/login', null],
    ['USUARIO_CREADO', '/api/usuarios', 'u-02'],
    ['LOGIN_EXITOSO', '/api/auth/login', 'u-02'],
    ['ACCION_CORRECTIVA_REGISTRADA', '/api/alertas', 'u-01'],
  ]
  const auditoria: RegistroAuditoria[] = Array.from({ length: 18 }, (_, i) => {
    const [accion, recurso, usuarioId] = plantillaAuditoria[i % plantillaAuditoria.length]
    return {
      id: `au-${String(i + 1).padStart(3, '0')}`,
      usuario_id: usuarioId,
      accion,
      recurso,
      detalle: null,
      ip_origen: ipsDemo[Math.floor(rng() * ipsDemo.length)],
      created_at: new Date(ahora - i * 5 * 60 * 60 * 1000 - Math.floor(rng() * 40) * 60 * 1000).toISOString(),
    }
  })

  return { lecturas, alertas, acciones, trazabilidad, usuarios: [...USUARIOS_DEMO], auditoria }
}

export const estadoDemo: EstadoDemo = generarEstadoInicial()

/* ── Lecturas en vivo para el stream simulado ───────────────────── */
const rngVivo = crearRng(Date.now() % 2147483647)
let empujeVivo = 0

export function generarLecturaEnVivo(): LecturaTermica {
  const previa = estadoDemo.lecturas.at(-1)
  const basePrevia = previa?.temperatura_interna ?? 4.9

  const puerta = rngVivo() < 0.04
  if (puerta) empujeVivo = 0.8 + rngVivo() * 0.6

  let interna = basePrevia + (rngVivo() - 0.5) * 0.3 + empujeVivo * 0.4
  empujeVivo = Math.max(0, empujeVivo - 0.35)
  // Deriva suave hacia el centro del rango para no escaparse en sesiones largas.
  interna += (4.9 - interna) * 0.12
  interna = Math.min(9.3, Math.max(2.1, interna))

  const lectura: LecturaTermica = {
    id: `lec-vivo-${Date.now()}`,
    device_id: DISPOSITIVO_DEMO,
    timestamp: new Date().toISOString(),
    temperatura_interna: redondear(interna, 1),
    temperatura_ambiental: redondear(21.8 + (rngVivo() - 0.5) * 1.4, 1),
    humedad_ambiental: redondear(62 + (rngVivo() - 0.5) * 5, 0),
    apertura_refrigerador: puerta,
    estado_conectividad: 'online',
    nivel_riesgo: clasificar(interna),
    confianza_ia: 0.9,
    modelo_version: 'demo-3.0.0',
    origen_clasificacion: 'random_forest',
    estado_inferencia: 'completada',
    motivo_no_inferencia: null,
  }
  estadoDemo.lecturas.push(lectura)
  return lectura
}

/* ── Sesión demo: JWT falso que decodificarSesion() entiende ───── */
function base64url(texto: string): string {
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function crearTokenDemo(email: string): string {
  const normalizado = email.trim().toLowerCase()
  const conocido = USUARIOS_DEMO.find((u) => u.email === normalizado)
  const rol: Rol =
    conocido?.rol ??
    (normalizado.includes('admin')
      ? 'administrador'
      : normalizado.includes('tec')
        ? 'tecnico'
        : 'farmaceutico')
  const cabecera = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({ sub: conocido?.id ?? 'u-demo', email: normalizado, rol }),
  )
  return `${cabecera}.${payload}.demo`
}
