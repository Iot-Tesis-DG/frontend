import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import type { AlertaTermica } from '@/domain/entities/AlertaTermica'
import type { LecturaTermica } from '@/domain/entities/LecturaTermica'
import type { Rol } from '@/domain/value-objects/Rol'
import { crearTokenDemo, estadoDemo } from './datosDemo'

/**
 * Adapter de Axios para el modo demostración: intercepta cada request del
 * apiClient y responde con los datos simulados en memoria. Los hooks y las
 * páginas no cambian en absoluto — creen hablar con el backend real.
 */

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

function responder<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: {}, config }
}

function fallar(config: InternalAxiosRequestConfig, status: number, mensaje: string): never {
  const respuesta = responder(config, { detail: mensaje }, status)
  throw new AxiosError(mensaje, 'ERR_BAD_REQUEST', config, null, respuesta)
}

function parametros(config: InternalAxiosRequestConfig): Record<string, string> {
  const crudos = (config.params ?? {}) as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(crudos)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  )
}

function cuerpoJson(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return (config.data ?? {}) as Record<string, unknown>
}

function lecturasFiltradas(params: Record<string, string>): LecturaTermica[] {
  let resultado = [...estadoDemo.lecturas].reverse() // más recientes primero
  if (params.device_id) {
    resultado = resultado.filter((l) =>
      l.device_id.toLowerCase().includes(params.device_id.toLowerCase()),
    )
  }
  if (params.nivel_riesgo) resultado = resultado.filter((l) => l.nivel_riesgo === params.nivel_riesgo)
  if (params.desde) resultado = resultado.filter((l) => l.timestamp >= params.desde)
  if (params.hasta) resultado = resultado.filter((l) => l.timestamp <= params.hasta)
  return resultado.slice(0, Number(params.limite ?? 200))
}

function alertasFiltradas(params: Record<string, string>): AlertaTermica[] {
  let resultado = [...estadoDemo.alertas].reverse()
  if (params.revisada === 'true') resultado = resultado.filter((a) => a.revisada)
  if (params.revisada === 'false') resultado = resultado.filter((a) => !a.revisada)
  return resultado.slice(0, Number(params.limite ?? 200))
}

export const demoAdapter: AxiosAdapter = async (config) => {
  await esperar(180 + Math.random() * 240)

  const metodo = (config.method ?? 'get').toLowerCase()
  const url = (config.url ?? '').split('?')[0]
  const params = parametros(config)

  /* ── Autenticación ─────────────────────────────────────────── */
  if (metodo === 'post' && url === '/api/auth/login') {
    const cuerpo = new URLSearchParams(String(config.data ?? ''))
    const email = cuerpo.get('username') ?? 'farmaceutico@demo.pe'
    return responder(config, { access_token: crearTokenDemo(email), token_type: 'bearer' })
  }
  if (metodo === 'post' && url === '/api/auth/sse-ticket') {
    return responder(config, { ticket: 'ticket-demo' })
  }

  /* ── Lecturas y alertas ─────────────────────────────────────── */
  if (metodo === 'get' && url === '/api/lecturas') {
    return responder(config, lecturasFiltradas(params))
  }
  if (metodo === 'get' && url === '/api/alertas') {
    return responder(config, alertasFiltradas(params))
  }

  const revisar = /^\/api\/alertas\/([^/]+)\/revisar$/.exec(url)
  if (metodo === 'patch' && revisar) {
    const alerta = estadoDemo.alertas.find((a) => a.id === revisar[1])
    if (!alerta) fallar(config, 404, 'Alerta no encontrada')
    alerta.revisada = true
    alerta.revisada_por = 'u-01'
    return responder(config, alerta)
  }

  const accion = /^\/api\/alertas\/([^/]+)\/acciones-correctivas$/.exec(url)
  if (metodo === 'post' && accion) {
    const nueva = {
      id: `ac-vivo-${Date.now()}`,
      alert_id: accion[1],
      usuario_id: 'u-01',
      descripcion: String(cuerpoJson(config).descripcion ?? ''),
      created_at: new Date().toISOString(),
    }
    estadoDemo.acciones.push(nueva)
    return responder(config, nueva, 201)
  }

  /* ── Trazabilidad ───────────────────────────────────────────── */
  if (metodo === 'get' && url === '/api/trazabilidad/verificar') {
    return responder(config, {
      integra: true,
      total_registros: estadoDemo.trazabilidad.length,
      primer_registro_inconsistente: null,
    })
  }
  if (metodo === 'get' && url === '/api/trazabilidad') {
    let registros = [...estadoDemo.trazabilidad].reverse()
    if (params.tipo_evento) registros = registros.filter((r) => r.tipo_evento === params.tipo_evento)
    return responder(config, registros.slice(0, Number(params.limite ?? 200)))
  }

  /* ── Reportes BPA ───────────────────────────────────────────── */
  if (metodo === 'get' && url === '/api/reportes/bpa') {
    const desde = params.fecha_desde ?? new Date(0).toISOString()
    const hasta = params.fecha_hasta ?? new Date().toISOString()
    const enRango = (ts: string | null) => ts !== null && ts >= desde && ts <= hasta
    return responder(config, {
      device_id: params.device_id ?? null,
      fecha_desde: desde,
      fecha_hasta: hasta,
      lecturas: estadoDemo.lecturas.filter((l) => enRango(l.timestamp)),
      alertas: estadoDemo.alertas.filter((a) => enRango(a.created_at)),
      registros_trazabilidad: estadoDemo.trazabilidad.filter((r) => enRango(r.timestamp)),
    })
  }

  /* ── Usuarios y auditoría ───────────────────────────────────── */
  if (metodo === 'get' && url === '/api/usuarios') {
    return responder(config, estadoDemo.usuarios)
  }
  if (metodo === 'post' && url === '/api/usuarios') {
    const cuerpo = cuerpoJson(config)
    const email = String(cuerpo.email ?? '').toLowerCase()
    if (estadoDemo.usuarios.some((u) => u.email === email)) {
      fallar(config, 409, 'Ya existe un usuario con ese correo')
    }
    const nuevo = {
      id: `u-vivo-${Date.now()}`,
      nombre: String(cuerpo.nombre ?? ''),
      email,
      rol: (cuerpo.rol ?? 'tecnico') as Rol,
    }
    estadoDemo.usuarios.push(nuevo)
    return responder(config, nuevo, 201)
  }
  if (metodo === 'get' && url === '/api/auditoria') {
    return responder(config, estadoDemo.auditoria.slice(0, Number(params.limite ?? 200)))
  }

  fallar(config, 404, `Ruta demo no implementada: ${metodo.toUpperCase()} ${url}`)
}
