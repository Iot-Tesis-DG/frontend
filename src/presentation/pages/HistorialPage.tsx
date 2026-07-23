import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DoorClosed, DoorOpen, FilterX, SlidersHorizontal } from 'lucide-react'

import { useHistorial, type FiltrosHistorial } from '@/application/hooks/useHistorial'
import { NIVELES_RIESGO } from '@/domain/value-objects/NivelRiesgo'
import { PageHeader } from '../components/PageHeader'
import { RiskBadge } from '../components/RiskBadge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input, Label, NativeSelect } from '../components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'

const FILTROS_INICIALES: FiltrosHistorial = {}

export function HistorialPage() {
  const { t } = useTranslation()
  const { lecturas, cargando, consultar } = useHistorial()
  const [filtros, setFiltros] = useState<FiltrosHistorial>(FILTROS_INICIALES)

  const actualizarFiltro = (campo: keyof FiltrosHistorial, valor: string) => {
    setFiltros((previos) => ({ ...previos, [campo]: valor || undefined }))
  }

  const limpiar = () => {
    setFiltros(FILTROS_INICIALES)
    void consultar(FILTROS_INICIALES)
  }

  return (
    <div>
      <PageHeader eyebrow={t('nav.seccionOperacion')} titulo={t('historial.titulo')} descripcion={t('historial.descripcion')} />

      {/* ── Filtros ─────────────────────────────────────────── */}
      <Card className="mb-5 animate-rise">
        <CardContent className="p-5">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-medium text-muted">
            <SlidersHorizontal className="size-3.5" />
            {t('historial.filtros')}
          </p>
          <form
            className="grid grid-cols-1 items-end gap-3 min-[480px]:grid-cols-2 lg:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault()
              void consultar(filtros)
            }}
          >
            <div>
              <Label htmlFor="f-device">{t('historial.dispositivo')}</Label>
              <Input
                id="f-device"
                value={filtros.device_id ?? ''}
                onChange={(e) => actualizarFiltro('device_id', e.target.value)}
                placeholder="FARM-01-CDL"
              />
            </div>
            <div>
              <Label htmlFor="f-riesgo">{t('historial.nivelRiesgo')}</Label>
              <NativeSelect
                id="f-riesgo"
                value={filtros.nivel_riesgo ?? ''}
                onChange={(e) => actualizarFiltro('nivel_riesgo', e.target.value)}
              >
                <option value="">{t('historial.todosNiveles')}</option>
                {NIVELES_RIESGO.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {t(`riesgo.${nivel}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="f-desde">{t('historial.desde')}</Label>
              <Input
                id="f-desde"
                type="datetime-local"
                value={filtros.desde ?? ''}
                onChange={(e) => actualizarFiltro('desde', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="f-hasta">{t('historial.hasta')}</Label>
              <Input
                id="f-hasta"
                type="datetime-local"
                value={filtros.hasta ?? ''}
                onChange={(e) => actualizarFiltro('hasta', e.target.value)}
              />
            </div>
            <div className="flex gap-2 min-[480px]:col-span-2 lg:col-span-1">
              <Button type="submit" className="flex-1">
                {t('historial.aplicar')}
              </Button>
              <Button variant="ghost" onClick={limpiar} aria-label={t('historial.limpiar')}>
                <FilterX />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Tabla ───────────────────────────────────────────── */}
      <div className="animate-rise" style={{ animationDelay: '60ms' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('historial.fecha')}</TableHead>
              <TableHead>{t('historial.dispositivo')}</TableHead>
              <TableHead className="text-right">{t('historial.tempInterna')}</TableHead>
              <TableHead className="text-right">{t('historial.tempAmbiental')}</TableHead>
              <TableHead className="text-right">{t('historial.humedad')}</TableHead>
              <TableHead>{t('historial.puerta')}</TableHead>
              <TableHead>{t('historial.riesgo')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableEmpty colSpan={7}>{t('historial.cargando')}</TableEmpty>
            ) : lecturas.length === 0 ? (
              <TableEmpty colSpan={7}>{t('historial.sinResultados')}</TableEmpty>
            ) : (
              lecturas.map((lectura) => (
                <TableRow key={lectura.id}>
                  <TableCell className="nums text-[13px]">
                    {new Date(lectura.timestamp).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell className="text-[13px]">{lectura.device_id}</TableCell>
                  <TableCell className="nums text-right font-medium">
                    {lectura.temperatura_interna?.toFixed(1) ?? '—'} °C
                  </TableCell>
                  <TableCell className="nums text-right text-muted">
                    {lectura.temperatura_ambiental?.toFixed(1) ?? '—'} °C
                  </TableCell>
                  <TableCell className="nums text-right text-muted">
                    {lectura.humedad_ambiental?.toFixed(0) ?? '—'} %
                  </TableCell>
                  <TableCell>
                    {lectura.apertura_refrigerador ? (
                      <DoorOpen className="size-4 text-honey-600" aria-label={t('dashboard.puertaAbierta')} />
                    ) : (
                      <DoorClosed className="size-4 text-faint" aria-label={t('dashboard.puertaCerrada')} />
                    )}
                  </TableCell>
                  <TableCell>
                    <RiskBadge nivel={lectura.nivel_riesgo} />
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
