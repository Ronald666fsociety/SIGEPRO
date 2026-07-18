import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tarea: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    proyecto: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/totales', () => ({
  recalcularTotales: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { recalcularTotales } from '@/lib/totales'
import { POST } from '@/app/api/tareas/route'

function createRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/tareas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '1',
      'x-user-role': 'JEFE_PROYECTO',
      'x-user-nombre': 'Carlos',
      'x-user-email': 'carlos@test.com',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/tareas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a tarea and calls recalcularTotales', async () => {
    // Mock proyecto exists
    vi.mocked(prisma.proyecto.findUnique).mockResolvedValue({ id: 1, activo: true } as any)
    // Mock tarea.create
    const mockTarea = {
      id: 10,
      nombre: 'Nueva Tarea',
      descripcion: null,
      fechaInicio: null,
      fechaFin: null,
      peso: 1,
      progreso: 0,
      activo: true,
      proyectoId: 1,
      tareaPadreId: null,
    }
    vi.mocked(prisma.tarea.create).mockResolvedValue(mockTarea as any)

    const req = createRequest({
      nombre: 'Nueva Tarea',
      proyectoId: 1,
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.nombre).toBe('Nueva Tarea')
    expect(recalcularTotales).toHaveBeenCalledWith(1)
  })

  it('creates child tarea with tareaPadreId', async () => {
    // Mock proyecto exists
    vi.mocked(prisma.proyecto.findUnique).mockResolvedValue({ id: 1, activo: true } as any)
    // Mock parent tarea exists
    vi.mocked(prisma.tarea.findUnique).mockResolvedValue({
      id: 5,
      proyectoId: 1,
      activo: true,
    } as any)

    const mockChild = {
      id: 11,
      nombre: 'Sub Tarea',
      descripcion: null,
      fechaInicio: null,
      fechaFin: null,
      peso: 1,
      progreso: 0,
      activo: true,
      proyectoId: 1,
      tareaPadreId: 5,
    }
    vi.mocked(prisma.tarea.create).mockResolvedValue(mockChild as any)

    const req = createRequest({
      nombre: 'Sub Tarea',
      proyectoId: 1,
      tareaPadreId: 5,
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.tareaPadreId).toBe(5)
  })

  it('returns 400 for missing required fields', async () => {
    const req = createRequest({ proyectoId: 1 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
