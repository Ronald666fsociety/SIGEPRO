import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    proyecto: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    usuario: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { GET, POST } from '@/app/api/proyectos/route'

function createRequest(body?: unknown, method = 'GET', headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/proyectos', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '1',
      'x-user-role': 'ADMINISTRADOR',
      'x-user-nombre': 'Admin',
      'x-user-email': 'admin@test.com',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/proyectos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of active proyectos', async () => {
    const mockProyectos = [
      {
        id: 1,
        codigo: 'ERP',
        nombre: 'Implementación ERP',
        descripcion: 'Desc',
        presupuestoTotal: { toNumber: () => 100000 },
        costoRealTotal: { toNumber: () => 50000 },
        estado: 'EN_CURSO',
        fechaInicio: new Date('2024-01-15'),
        fechaFin: null,
        activo: true,
        jefeProyectoId: 1,
        jefeProyecto: { id: 1, nombre: 'Carlos', email: 'carlos@test.com' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
      },
    ]
    vi.mocked(prisma.proyecto.findMany).mockResolvedValue(mockProyectos as any)

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].nombre).toBe('Implementación ERP')
    expect(data[0].nombreJefeProyecto).toBe('Carlos')
  })

  it('returns empty array when no proyectos', async () => {
    vi.mocked(prisma.proyecto.findMany).mockResolvedValue([])
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data).toEqual([])
  })
})

describe('POST /api/proyectos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a proyecto and returns 201', async () => {
    // Mock jefe exists
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id: 2, activo: true } as any)

    const mockCreated = {
      id: 1,
      codigo: 'ERP',
      nombre: 'Implementación ERP',
      descripcion: 'Desc',
      presupuestoTotal: { toNumber: () => 100000 },
      costoRealTotal: { toNumber: () => 0 },
      estado: 'EN_CURSO',
      fechaInicio: null,
      fechaFin: null,
      activo: true,
      jefeProyectoId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(prisma.proyecto.create).mockResolvedValue(mockCreated as any)

    const req = createRequest({
      codigo: 'ERP',
      nombre: 'Implementación ERP',
      descripcion: 'Desc',
      presupuestoTotal: '100000',
      estado: 'EN_CURSO',
      jefeProyectoId: '2',
    }, 'POST')
    const res = await POST(req)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.nombre).toBe('Implementación ERP')
    expect(data.id).toBe(1)
  })

  it('returns 400 for missing required fields', async () => {
    const req = createRequest({ nombre: 'Only Name' }, 'POST')
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.code).toBe('INVALID_INPUT')
  })
})
