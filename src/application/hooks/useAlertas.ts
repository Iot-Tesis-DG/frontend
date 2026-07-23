import { useCallback, useEffect, useState } from 'react'

import type { AlertaTermica } from '@/domain/entities/AlertaTermica'
import { apiClient } from '@/infrastructure/api/apiClient'

export type FiltroRevision = 'todas' | 'pendientes' | 'revisadas'

export function useAlertas() {
  const [alertas, setAlertas] = useState<AlertaTermica[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<FiltroRevision>('pendientes')

  const consultar = useCallback(async (filtroActual: FiltroRevision) => {
    setCargando(true)
    try {
      const params: Record<string, string> = { limite: '200' }
      if (filtroActual === 'pendientes') params.revisada = 'false'
      if (filtroActual === 'revisadas') params.revisada = 'true'
      const { data } = await apiClient.get<AlertaTermica[]>('/api/alertas', { params })
      setAlertas(data)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void consultar(filtro)
  }, [consultar, filtro])

  const marcarRevisada = useCallback(
    async (alertaId: string) => {
      await apiClient.patch(`/api/alertas/${alertaId}/revisar`)
      await consultar(filtro)
    },
    [consultar, filtro],
  )

  const registrarAccionCorrectiva = useCallback(
    async (alertaId: string, descripcion: string) => {
      await apiClient.post(`/api/alertas/${alertaId}/acciones-correctivas`, { descripcion })
    },
    [],
  )

  return { alertas, cargando, filtro, setFiltro, marcarRevisada, registrarAccionCorrectiva }
}
