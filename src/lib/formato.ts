import i18n from '@/infrastructure/i18n'

/**
 * Formato de fechas ligado al idioma del interfaz.
 *
 * Las tablas llamaban a `toLocaleString('es-PE')` con el locale escrito a mano.
 * Con el interfaz en inglés eso producía documentos mixtos —cabeceras en inglés
 * y «14/03/2026, 8:05:12 p. m.» en las celdas— y, peor para una auditoría,
 * fechas en formato día/mes que un lector angloparlante interpreta al revés.
 */
export function localeActual(): string {
  return i18n.resolvedLanguage === 'en' ? 'en-US' : 'es-PE'
}

/** Fecha y hora completas, para celdas de tabla y registros de auditoría. */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString(localeActual())
}

/** Solo la hora, con segundos: el eje temporal del monitoreo en vivo. */
export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString(localeActual(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Solo la fecha, sin hora: encabezados de periodo y resúmenes. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleDateString(localeActual())
}
