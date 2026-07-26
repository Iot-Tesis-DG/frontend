import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AlertaTermica } from '@/domain/entities/AlertaTermica'
import { useAuthStore } from '@/application/stores/authStore'
import type { Rol } from '@/domain/value-objects/Rol'

const useAlertas = vi.hoisted(() => vi.fn())
vi.mock('@/application/hooks/useAlertas', () => ({ useAlertas }))

import { AlertasPage } from '@/presentation/pages/AlertasPage'

function alerta(over: Partial<AlertaTermica> = {}): AlertaTermica {
  return {
    id: 'al-1',
    reading_id: 'l-1',
    device_id: 'FARM-01-CDL',
    nivel_riesgo: 'excursion_critica',
    mensaje: 'Temperatura fuera del rango 2-8 °C',
    revisada: false,
    revisada_por: null,
    created_at: '2026-07-25T12:00:00Z',
    ...over,
  }
}

function sesionCon(rol: Rol) {
  useAuthStore.setState({
    usuario: { id: 'u-1', email: `${rol}@upc.pe`, rol, expiraEn: Date.now() + 3600_000 },
    autenticado: true,
    requierePrivacidad: false,
  })
}

function montar(alertas: AlertaTermica[]) {
  const marcarRevisada = vi.fn()
  useAlertas.mockReturnValue({
    alertas,
    cargando: false,
    filtro: 'pendientes',
    setFiltro: vi.fn(),
    marcarRevisada,
    registrarAccionCorrectiva: vi.fn(),
  })
  render(<AlertasPage />)
  return marcarRevisada
}

describe('AlertasPage (RF-09, RF-10, HU-20/21/27)', () => {
  beforeEach(() => {
    useAlertas.mockReset()
    sesionCon('farmaceutico')
  })

  it('muestra la alerta con su dispositivo y su mensaje', () => {
    montar([alerta()])

    expect(screen.getByText('FARM-01-CDL')).toBeInTheDocument()
    expect(screen.getByText(/fuera del rango/i)).toBeInTheDocument()
  })

  it('ofrece los tres filtros de revisión', () => {
    montar([alerta()])

    const nombres = screen.getAllByRole('button').map((b) => b.textContent)
    expect(nombres).toEqual(expect.arrayContaining(['Pendientes', 'Revisadas', 'Todas']))
  })

  it('permite a un farmacéutico marcar la alerta como revisada', () => {
    sesionCon('farmaceutico')
    montar([alerta({ revisada: false })])

    expect(screen.getByRole('button', { name: /marcar revisada/i })).toBeInTheDocument()
  })

  it('no ofrece el botón de revisión a un técnico (RBAC en la vista)', () => {
    // El backend ya rechaza la acción por rol; la vista no debe ofrecer un
    // botón que sólo puede terminar en un 403.
    sesionCon('tecnico')
    montar([alerta({ revisada: false })])

    expect(screen.queryByRole('button', { name: /marcar revisada/i })).not.toBeInTheDocument()
  })

  it('avisa cuando no hay alertas para el filtro activo', () => {
    montar([])
    expect(screen.getByText(/no hay alertas|sin alertas/i)).toBeInTheDocument()
  })
})
