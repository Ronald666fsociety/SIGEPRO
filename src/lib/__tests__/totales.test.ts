import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    proyecto: {
      update: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { recalcularTotales } from '@/lib/totales'

describe('recalcularTotales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sums presupuestoEstimado to presupuestoTotal and costoEjecutado to costoRealTotal', async () => {
    // suma de presupuesto_estimado = 10000, suma de costo_ejecutado = 4500
    const mockRawResult = [{ total_presupuesto: '10000', total_costo: '4500' }]
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawResult)

    await recalcularTotales(1)

    expect(prisma.proyecto.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        presupuestoTotal: 10000,
        costoRealTotal: 4500,
      },
    })
  })

  it('handles zero tareas gracefully (empty project)', async () => {
    const mockRawResult = [{ total_presupuesto: '0', total_costo: '0' }]
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawResult)

    await recalcularTotales(2)

    expect(prisma.proyecto.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: {
        presupuestoTotal: 0,
        costoRealTotal: 0,
      },
    })
  })

  it('handles multiple tareas with different costs', async () => {
    // tarea1: costo=5000, tarea2: costo=3000, tarea3: costo=2000 → total=10000
    const mockRawResult = [{ total_presupuesto: '25000', total_costo: '10000' }]
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawResult)

    await recalcularTotales(3)

    expect(prisma.proyecto.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        presupuestoTotal: 25000,
        costoRealTotal: 10000,
      },
    })
  })

  it('handles NULL values from raw query', async () => {
    const mockRawResult = [{ total_presupuesto: null, total_costo: null }]
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawResult)

    await recalcularTotales(4)

    expect(prisma.proyecto.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: {
        presupuestoTotal: 0,
        costoRealTotal: 0,
      },
    })
  })
})
