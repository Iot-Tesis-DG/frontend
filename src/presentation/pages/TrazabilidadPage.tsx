import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, ShieldAlert, ShieldCheck } from 'lucide-react'

import { useTrazabilidad } from '@/application/hooks/useTrazabilidad'
import { cn } from '@/lib/utils'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Label, NativeSelect } from '../components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'

const TIPOS_EVENTO = [
  'LECTURA_TERMICA',
  'ALERTA_TERMICA',
  'ACCION_CORRECTIVA',
  'REPORTE_BPA',
  'AUDITORIA',
  'CONECTIVIDAD',
]

function HashCorto({ hash }: { hash: string }) {
  return (
    <span className="nums text-xs text-muted" title={hash}>
      {hash.slice(0, 10)}…{hash.slice(-6)}
    </span>
  )
}

export function TrazabilidadPage() {
  const { t } = useTranslation()
  const { registros, cargando, consultar, verificacion, verificando, verificarIntegridad } =
    useTrazabilidad()
  const [tipoEvento, setTipoEvento] = useState('')

  return (
    <div>
      <PageHeader eyebrow={t('nav.seccionCumplimiento')} titulo={t('trazabilidad.titulo')} descripcion={t('trazabilidad.descripcion')}>
        <Button onClick={() => void verificarIntegridad()} disabled={verificando}>
          <ShieldCheck />
          {verificando ? t('trazabilidad.verificando') : t('trazabilidad.verificar')}
        </Button>
      </PageHeader>

      {/* ── Resultado de verificación ───────────────────────── */}
      {verificacion && (
        <Card
          className={cn(
            'mb-5 animate-rise',
            verificacion.integra
              ? 'border-pine-200 bg-pine-100/60'
              : 'border-clay-100 bg-clay-100/60',
          )}
        >
          <CardContent className="flex items-center gap-3 p-4">
            {verificacion.integra ? (
              <ShieldCheck className="size-5 shrink-0 text-pine-600" />
            ) : (
              <ShieldAlert className="size-5 shrink-0 text-clay-600" />
            )}
            <div>
              <p
                className={cn(
                  'text-sm font-semibold',
                  verificacion.integra ? 'text-pine-700' : 'text-clay-700',
                )}
              >
                {verificacion.integra ? t('trazabilidad.cadenaIntegra') : t('trazabilidad.cadenaRota')}
              </p>
              <p className="text-[13px] text-muted">
                {verificacion.integra
                  ? t('trazabilidad.cadenaIntegraDetalle', { n: verificacion.total_registros })
                  : t('trazabilidad.cadenaRotaDetalle', {
                      n: verificacion.primer_registro_inconsistente,
                    })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filtro por tipo ─────────────────────────────────── */}
      <div className="mb-4 max-w-64 animate-rise">
        <Label htmlFor="f-evento">{t('trazabilidad.tipoEvento')}</Label>
        <NativeSelect
          id="f-evento"
          value={tipoEvento}
          onChange={(e) => {
            setTipoEvento(e.target.value)
            void consultar(e.target.value || undefined)
          }}
        >
          <option value="">{t('trazabilidad.todosEventos')}</option>
          {TIPOS_EVENTO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="animate-rise" style={{ animationDelay: '60ms' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('trazabilidad.fecha')}</TableHead>
              <TableHead>{t('trazabilidad.evento')}</TableHead>
              <TableHead>{t('historial.dispositivo')}</TableHead>
              <TableHead title={t('trazabilidad.selloAyuda')} className="cursor-help">
                {t('trazabilidad.hashAnterior')}
              </TableHead>
              <TableHead title={t('trazabilidad.selloAyuda')} className="cursor-help">
                {t('trazabilidad.hash')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableEmpty colSpan={5}>{t('app.cargando')}</TableEmpty>
            ) : registros.length === 0 ? (
              <TableEmpty colSpan={5}>
                <span className="inline-flex flex-col items-center gap-2">
                  <Link2 className="size-5 text-faint" />
                  {t('trazabilidad.sinRegistros')}
                </span>
              </TableEmpty>
            ) : (
              registros.map((registro) => (
                <TableRow key={registro.id}>
                  <TableCell className="nums text-[13px]">
                    {new Date(registro.timestamp).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{registro.tipo_evento}</Badge>
                  </TableCell>
                  <TableCell className="text-[13px]">{registro.device_id ?? '—'}</TableCell>
                  <TableCell>
                    <HashCorto hash={registro.previous_hash} />
                  </TableCell>
                  <TableCell>
                    <HashCorto hash={registro.hash_actual} />
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
