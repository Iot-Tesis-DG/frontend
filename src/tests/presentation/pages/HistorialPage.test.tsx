import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LecturaTermica } from '@/domain/entities/LecturaTermica'

const useHistorial = vi.hoisted(() => vi.fn())
vi.mock('@/application/hooks/useHistorial', () => ({ useHistorial }))

import { HistorialPage } from '@/presentation/pages/HistorialPage'

function lectura(over: Partial<LecturaTermica> = {}): LecturaTermica {
  return {
    id: 'l-1',
    device_id: 'FARM-01-CDL',
    timestamp: '2026-07-25T12:00:00Z',
    temperatura_ambiental: 5.2,
    humedad_ambiental: 62,
    temperatura_interna: 4.5,
    apertura_refrigerador: false,
    estado_conectividad: 'online',
    nivel_riesgo: 'normal',
    confianza_ia: 0.98,
    modelo_version: '3.0.0',
    origen_clasificacion: 'random_forest',
    estado_inferencia: 'completada',
    motivo_no_inferencia: null,
    ...over,
  }
}

function montar(lecturas: LecturaTermica[], consultar = vi.fn()) {
  useHistorial.mockReturnValue({ lecturas, cargando: false, consultar })
  render(<HistorialPage />)
  return consultar
}

describe('HistorialPage (RF-12, HU-36)', () => {
  beforeEach(() => useHistorial.mockReset())

  it('muestra las lecturas consultadas', () => {
    montar([lectura()])

    expect(screen.getByText('FARM-01-CDL')).toBeInTheDocument()
    expect(screen.getByText(/4[.,]5/)).toBeInTheDocument()
  })

  it('ofrece los filtros que exige RF-12', () => {
    montar([lectura()])

    // Dispositivo, nivel de riesgo y rango de fechas: los ejes por los que se
    // reconstruye un episodio en una auditoría.
    expect(screen.getAllByText(/filtros/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/nivel de riesgo/i)).toBeInTheDocument()
    expect(screen.getByText(/^desde$/i)).toBeInTheDocument()
    expect(screen.getByText(/^hasta$/i)).toBeInTheDocument()
  })

  it('vuelve a consultar el backend al aplicar un filtro', async () => {
    // El filtrado debe ocurrir server-side: si se filtrara en memoria, el
    // historial quedaría limitado a la página ya descargada.
    const consultar = montar([lectura()])
    consultar.mockClear()

    await userEvent.click(screen.getByRole('button', { name: /consultar|filtrar|buscar|aplicar/i }))

    expect(consultar).toHaveBeenCalled()
  })

  it('avisa cuando no hay lecturas para el filtro', () => {
    montar([])
    expect(screen.getByText(/no hay lecturas|sin lecturas|sin resultados/i)).toBeInTheDocument()
  })
})
