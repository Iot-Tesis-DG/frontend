import { useCallback, useEffect, useState } from 'react'

import type {
  EstadoCadena,
  RegistroTrazabilidad,
  VerificacionIntegridad,
} from '@/domain/entities/RegistroTrazabilidad'
import { apiClient } from '@/infrastructure/api/apiClient'

export function useTrazabilidad() {
  const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
  const [cargando, setCargando] = useState(true)
  const [verificacion, setVerificacion] = useState<VerificacionIntegridad | null>(null)
  const [verificando, setVerificando] = useState(false)
  const [estadoCadena, setEstadoCadena] = useState<EstadoCadena | null>(null)

  const consultar = useCallback(async (tipoEvento?: string) => {
    setCargando(true)
    try {
      const params: Record<string, string> = { limite: '200' }
      if (tipoEvento) params.tipo_evento = tipoEvento
      const { data } = await apiClient.get<RegistroTrazabilidad[]>('/api/trazabilidad', { params })
      setRegistros(data)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void consultar()
  }, [consultar])

  const consultarEstadoCadena = useCallback(async () => {
    const { data } = await apiClient.get<EstadoCadena>('/api/trazabilidad/estado')
    setEstadoCadena(data)
  }, [])

  useEffect(() => {
    void consultarEstadoCadena()
  }, [consultarEstadoCadena])

  const verificarIntegridad = useCallback(async () => {
    setVerificando(true)
    try {
      const { data } = await apiClient.get<VerificacionIntegridad>('/api/trazabilidad/verificar')
      setVerificacion(data)
      await consultarEstadoCadena()
    } finally {
      setVerificando(false)
    }
  }, [consultarEstadoCadena])

  const aislarCorrupcion = useCallback(
    async (registroId: string): Promise<'ok' | 'error'> => {
      try {
        await apiClient.post(`/api/trazabilidad/corrupcion/${registroId}/aislar`)
        await consultarEstadoCadena()
        return 'ok'
      } catch {
        return 'error'
      }
    },
    [consultarEstadoCadena],
  )

  return {
    registros,
    cargando,
    consultar,
    verificacion,
    verificando,
    verificarIntegridad,
    estadoCadena,
    aislarCorrupcion,
  }
}
