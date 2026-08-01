import { useEffect, useState } from 'react'

import type { LecturaTermica } from '@/domain/entities/LecturaTermica'
import { apiClient } from '@/infrastructure/api/apiClient'
import { suscribirseLecturas } from '@/infrastructure/sse/sseClient'

const MAX_LECTURAS_EN_MEMORIA = 60

interface MonitoreoTermico {
  ultima: LecturaTermica | null
  serie: LecturaTermica[]
  sseConectado: boolean
}

/**
 * Carga el historial reciente y se suscribe al flujo SSE en tiempo real.
 * La serie se mantiene en orden cronológico ascendente para las gráficas.
 */
export function useMonitoreoTermico(): MonitoreoTermico {
  const [serie, setSerie] = useState<LecturaTermica[]>([])
  const [sseConectado, setSseConectado] = useState(false)

  useEffect(() => {
    let activo = true

    apiClient
      .get<LecturaTermica[]>('/api/lecturas', { params: { limite: MAX_LECTURAS_EN_MEMORIA } })
      .then(({ data }) => {
        if (!activo) return
        // El historial no puede sobrescribir la serie: la suscripción SSE se
        // abre en el mismo efecto y no hay garantía de qué responde antes. Si
        // una lectura en vivo llegaba mientras el GET seguía en vuelo, este
        // `set` la borraba —y con una excursión térmica en marcha, esa es
        // justo la lectura que no puede perderse—. Se antepone el historial a
        // lo ya recibido, descartando por `id` lo que venga repetido.
        setSerie((previa) => {
          const yaRecibidas = new Set(previa.map((lectura) => lectura.id))
          const historial = [...data]
            .reverse()
            .filter((lectura) => !yaRecibidas.has(lectura.id))
          return [...historial, ...previa].slice(-MAX_LECTURAS_EN_MEMORIA)
        })
      })
      .catch(() => {
        /* el dashboard arranca vacío si el backend aún no tiene lecturas */
      })

    const cerrar = suscribirseLecturas(
      (lectura) => {
        setSerie((previa) => [...previa, lectura].slice(-MAX_LECTURAS_EN_MEMORIA))
      },
      (conectado) => setSseConectado(conectado),
    )

    return () => {
      activo = false
      cerrar()
    }
  }, [])

  return { ultima: serie.at(-1) ?? null, serie, sseConectado }
}
