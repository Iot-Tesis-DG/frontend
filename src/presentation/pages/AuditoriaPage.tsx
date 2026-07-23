import { useTranslation } from 'react-i18next'
import { ScrollText } from 'lucide-react'

import { useAuditoria } from '@/application/hooks/useAuditoria'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'

export function AuditoriaPage() {
  const { t } = useTranslation()
  const { registros, cargando } = useAuditoria()

  return (
    <div>
      <PageHeader eyebrow={t('nav.seccionAdministracion')} titulo={t('auditoria.titulo')} descripcion={t('auditoria.descripcion')} />

      <div className="animate-rise">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('auditoria.fecha')}</TableHead>
              <TableHead>{t('auditoria.accion')}</TableHead>
              <TableHead>{t('auditoria.recurso')}</TableHead>
              <TableHead>{t('auditoria.usuario')}</TableHead>
              <TableHead>{t('auditoria.ip')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableEmpty colSpan={5}>{t('app.cargando')}</TableEmpty>
            ) : registros.length === 0 ? (
              <TableEmpty colSpan={5}>
                <span className="inline-flex flex-col items-center gap-2">
                  <ScrollText className="size-5 text-faint" />
                  {t('auditoria.sinRegistros')}
                </span>
              </TableEmpty>
            ) : (
              registros.map((registro) => (
                <TableRow key={registro.id}>
                  <TableCell className="nums text-[13px]">
                    {new Date(registro.created_at).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{registro.accion}</Badge>
                  </TableCell>
                  <TableCell className="nums text-[13px] text-muted">{registro.recurso}</TableCell>
                  <TableCell className="nums text-xs text-muted">
                    {registro.usuario_id ? `${registro.usuario_id.slice(0, 8)}…` : '—'}
                  </TableCell>
                  <TableCell className="nums text-[13px] text-muted">
                    {registro.ip_origen ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
