import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'

import type { Dispositivo } from '@/domain/entities/Dispositivo'
import { apiClient } from '@/infrastructure/api/apiClient'

export function useDispositivos() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [cargando, setCargando] = useState(true)

  const consultar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await apiClient.get<Dispositivo[]>('/api/dispositivos')
      setDispositivos(data)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void consultar()
  }, [consultar])

  const darDeBaja = useCallback(
    async (
      deviceId: string,
      motivo: string,
      descripcion: string | undefined,
      deviceIdReemplazo: string | undefined,
    ): Promise<'ok' | 'no_encontrado' | 'error'> => {
      try {
        await apiClient.post(`/api/dispositivos/${deviceId}/baja`, {
          motivo,
          descripcion: descripcion || undefined,
          device_id_reemplazo: deviceIdReemplazo || undefined,
        })
        await consultar()
        return 'ok'
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return 'no_encontrado'
        return 'error'
      }
    },
    [consultar],
  )

  return { dispositivos, cargando, consultar, darDeBaja }
}
