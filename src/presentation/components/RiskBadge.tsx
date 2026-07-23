import { useTranslation } from 'react-i18next'

import type { NivelRiesgo } from '@/domain/value-objects/NivelRiesgo'
import { Badge } from './ui/badge'

const VARIANTE_POR_NIVEL = {
  normal: 'ok',
  riesgo_preventivo: 'warn',
  excursion_critica: 'critical',
} as const

export function RiskBadge({ nivel }: { nivel: NivelRiesgo | null }) {
  const { t } = useTranslation()
  if (!nivel) return <Badge variant="outline">—</Badge>
  return (
    <Badge variant={VARIANTE_POR_NIVEL[nivel]} dot title={t(`riesgo.detalle.${nivel}`)}>
      {t(`riesgo.${nivel}`)}
    </Badge>
  )
}
