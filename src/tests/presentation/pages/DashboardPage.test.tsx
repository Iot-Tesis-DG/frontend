import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LecturaTermica } from '@/domain/entities/LecturaTermica'

const useMonitoreoTermico = vi.hoisted(() => vi.fn())

vi.mock('@/application/hooks/useMonitoreoTermico', () => ({ useMonitoreoTermico }))

// ECharts monta sobre un canvas real, que jsdom no implementa. La gráfica no es
// lo que se está afirmando aquí, así que se sustituye por un marcador.
vi.mock('@/infrastructure/charts/EChartWrapper', () => ({
  EChartWrapper: () => <div data-testid="grafica" />,
}))

import { DashboardPage } from '@/presentation/pages/DashboardPage'

function lectura(overrides: Partial<LecturaTermica> = {}): LecturaTermica {
  return {
    id: 'l-1',
    device_id: 'FARM-01-CDL',
    timestamp: '2026-07-25T12:34:56Z',
    temperatura_ambiental: 5.2,
    humedad_ambiental: 62,
    temperatura_interna: 4.5,
    apertura_refrigerador: false,
    estado_conectividad: 'online',
    nivel_riesgo: 'normal',
    confianza_ia: 0.98,
    modelo_version: '1.0.0',
    origen_clasificacion: 'random_forest',
    estado_inferencia: 'completada',
    motivo_no_inferencia: null,
    ...overrides,
  }
}

function renderizar(ultima: LecturaTermica, sseConectado = true) {
  useMonitoreoTermico.mockReturnValue({ ultima, serie: [ultima], sseConectado })
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage — RF-18: conectividad del dispositivo', () => {
  beforeEach(() => {
    useMonitoreoTermico.mockReset()
  })

  it('muestra el dispositivo en línea junto a su identificador', () => {
    renderizar(lectura({ estado_conectividad: 'online' }))

    expect(screen.getByText('FARM-01-CDL')).toBeInTheDocument()
    expect(screen.getByTestId('conectividad-dispositivo')).toHaveTextContent('En línea')
  })

  it('muestra el dispositivo sin conexión cuando el nodo dejó de reportar', () => {
    renderizar(lectura({ estado_conectividad: 'offline' }))

    expect(screen.getByTestId('conectividad-dispositivo')).toHaveTextContent('Sin conexión')
  })

  it('distingue la conectividad del nodo del estado del stream SSE', () => {
    // RF-18 se refiere al dispositivo registrado, no al EventSource del
    // navegador: un dashboard con SSE sano puede estar mirando un nodo caído,
    // y ese es justo el caso que la farmacia necesita ver.
    renderizar(lectura({ estado_conectividad: 'offline' }), true)

    const insignia = screen.getByTestId('conectividad-dispositivo')
    expect(insignia).toHaveTextContent('Sin conexión')

    // El indicador SSE sigue en línea, y no es la insignia del dispositivo:
    // ambos comparten vocabulario pero no estado.
    const enLinea = screen.getAllByText('En línea')
    expect(enLinea.length).toBeGreaterThan(0)
    expect(enLinea.some((el) => insignia.contains(el))).toBe(false)
  })
})
