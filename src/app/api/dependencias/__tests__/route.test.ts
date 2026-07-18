import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    dependenciaTarea: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    tarea: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/ciclico', () => ({
  detectaCiclo: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { detectaCiclo } from '@/lib/ciclico'
import { POST } from '@/app/api/dependencias/route'

function createRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/dependencias', {
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

describe('POST /api/dependencias', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a dependency when no cycle exists', async () => {
    vi.mocked(detectaCiclo).mockResolvedValue(false)
    // Mock both tareas exist
    vi.mocked(prisma.tarea.findUnique).mockResolvedValue({ id: 1, activo: true } as any)

    const mockDep = {
      id: 1,
      tipo: 'FIN_INICIO',
      tareaOrigenId: 1,
      tareaDestinoId: 2,
      tareaOrigen: { id: 1, nombre: 'Tarea Origen' },
      tareaDestino: { id: 2, nombre: 'Tarea Destino' },
    }
    vi.mocked(prisma.dependenciaTarea.create).mockResolvedValue(mockDep as any)

    const req = createRequest({
      tareaOrigenId: 1,
      tareaDestinoId: 2,
      tipo: 'FIN_INICIO',
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.tareaOrigenId).toBe(1)
    expect(data.tareaDestinoId).toBe(2)
  })

  it('returns 422 when cycle detected', async () => {
    vi.mocked(detectaCiclo).mockResolvedValue(true)
    vi.mocked(prisma.tarea.findUnique).mockResolvedValue({ id: 1, activo: true } as any)

    const req = createRequest({
      tareaOrigenId: 3,
      tareaDestinoId: 1,
      tipo: 'FIN_INICIO',
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(422)
    expect(data.code).toBe('CYCLE_DETECTED')
  })

  it('returns 400 for missing required fields', async () => {
    const req = createRequest({ tareaOrigenId: 1 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
