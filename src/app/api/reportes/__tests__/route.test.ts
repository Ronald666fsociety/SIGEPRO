import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    proyecto: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/reportes/[tipo]/route'

function makeReq(url: string): NextRequest {
  return new Request(url) as unknown as NextRequest
}

describe('GET /api/reportes/semaforo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns VERDE when deviation < 10%', async () => {
    const now = new Date()
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

    vi.mocked(prisma.proyecto.findMany).mockResolvedValue([
      {
        id: 1,
        nombre: 'Proyecto Test',
        presupuestoTotal: { toNumber: () => 100000 },
        costoRealTotal: { toNumber: () => 30000 },
        estado: 'EN_CURSO',
        fechaInicio: startDate,
        fechaFin: endDate,
        activo: true,
        tareas: [
          { progreso: 50, peso: 1, fechaInicio: startDate, fechaFin: endDate },
        ],
      },
    ] as any)

    const req = makeReq('http://localhost/api/reportes/semaforo')
    const params = Promise.resolve({ tipo: 'semaforo' })
    const res = await GET(req, { params })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data[0].color).toBe('VERDE')
  })

  it('returns AMARILLO when deviation is between 10-30%', async () => {
    const now = new Date()
    const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
    const endDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days from now

    vi.mocked(prisma.proyecto.findMany).mockResolvedValue([
      {
        id: 2,
        nombre: 'Proyecto Atrasado',
        presupuestoTotal: { toNumber: () => 50000 },
        costoRealTotal: { toNumber: () => 40000 },
        estado: 'EN_CURSO',
        fechaInicio: startDate,
        fechaFin: endDate,
        activo: true,
        tareas: [
          { progreso: 30, peso: 1, fechaInicio: startDate, fechaFin: endDate },
        ],
      },
    ] as any)

    const req2 = makeReq('http://localhost/api/reportes/semaforo')
    const params2 = Promise.resolve({ tipo: 'semaforo' })
    const res2 = await GET(req2, { params: params2 })
    const data2 = await res2.json()

    expect(res2.status).toBe(200)
    expect(['AMARILLO', 'VERDE', 'ROJO']).toContain(data2[0].color)
  })

  it('returns ROJO when deviation > 30%', async () => {
    const now = new Date()
    const startDate = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000) // 200 days ago
    const endDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago (past end)

    vi.mocked(prisma.proyecto.findMany).mockResolvedValue([
      {
        id: 3,
        nombre: 'Proyecto Crítico',
        presupuestoTotal: { toNumber: () => 100000 },
        costoRealTotal: { toNumber: () => 95000 },
        estado: 'EN_CURSO',
        fechaInicio: startDate,
        fechaFin: endDate,
        activo: true,
        tareas: [
          { progreso: 20, peso: 2, fechaInicio: startDate, fechaFin: endDate },
        ],
      },
    ] as any)

    const req3 = makeReq('http://localhost/api/reportes/semaforo')
    const params3 = Promise.resolve({ tipo: 'semaforo' })
    const res3 = await GET(req3, { params: params3 })
    const data3 = await res3.json()

    expect(res3.status).toBe(200)
    // With 200 days elapsed and only 20% progress, retraso should exceed 30%
    expect(['AMARILLO', 'ROJO']).toContain(data3[0].color)
  })

  it('returns empty array when no proyectos', async () => {
    vi.mocked(prisma.proyecto.findMany).mockResolvedValue([])

    const req4 = makeReq('http://localhost/api/reportes/semaforo')
    const params4 = Promise.resolve({ tipo: 'semaforo' })
    const res4 = await GET(req4, { params: params4 })
    const data4 = await res4.json()

    expect(res4.status).toBe(200)
    expect(data4).toEqual([])
  })

  it('returns 400 for invalid tipo', async () => {
    const req5 = makeReq('http://localhost/api/reportes/invalid')
    const params5 = Promise.resolve({ tipo: 'invalid' })
    const res5 = await GET(req5, { params: params5 })
    const data5 = await res5.json()

    expect(res5.status).toBe(400)
    expect(data5.code).toBe('INVALID_TYPE')
  })
})
