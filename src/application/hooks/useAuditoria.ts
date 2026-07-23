import { useEffect, useState } from 'react'

import type { RegistroAuditoria } from '@/domain/entities/Usuario'
import { apiClient } from '@/infrastructure/api/apiClient'

export function useAuditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    apiClient
      .get<RegistroAuditoria[]>('/api/auditoria', { params: { limite: 200 } })
      .then(({ data }) => {
        if (activo) setRegistros(data)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  return { registros, cargando }
}
