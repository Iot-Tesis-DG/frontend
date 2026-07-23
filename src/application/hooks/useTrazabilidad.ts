import { useCallback, useEffect, useState } from 'react'

import type {
  RegistroTrazabilidad,
  VerificacionIntegridad,
} from '@/domain/entities/RegistroTrazabilidad'
import { apiClient } from '@/infrastructure/api/apiClient'

export function useTrazabilidad() {
  const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([])
  const [cargando, setCargando] = useState(true)
  const [verificacion, setVerificacion] = useState<VerificacionIntegridad | null>(null)
  const [verificando, setVerificando] = useState(false)

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

  const verificarIntegridad = useCallback(async () => {
    setVerificando(true)
    try {
      const { data } = await apiClient.get<VerificacionIntegridad>('/api/trazabilidad/verificar')
      setVerificacion(data)
    } finally {
      setVerificando(false)
    }
  }, [])

  return { registros, cargando, consultar, verificacion, verificando, verificarIntegridad }
}
