import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}))

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    hashPassword: vi.fn().mockResolvedValue('$2a$10$mockedhash'),
  }
})

import { prisma } from '@/lib/prisma'
import { GET, POST } from '@/app/api/usuarios/route'

function createPOSTRequest(body: unknown, role = 'ADMINISTRADOR'): Request {
  return new Request('http://localhost/api/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '1',
      'x-user-role': role,
      'x-user-nombre': 'Admin',
      'x-user-email': 'admin@test.com',
    },
    body: JSON.stringify(body),
  })
}

describe('GET /api/usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of usuarios (ADMIN access)', async () => {
    const mockUsers = [
      { id: 1, nombre: 'Admin', email: 'admin@test.com', rol: 'ADMINISTRADOR', activo: true },
      { id: 2, nombre: 'User', email: 'user@test.com', rol: 'USUARIO', activo: true },
    ]
    vi.mocked(prisma.usuario.findMany).mockResolvedValue(mockUsers as any)

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(2)
    // Password should not be exposed (route uses select)
    expect(data[0].password).toBeUndefined()
  })

  it('returns empty array when no usuarios', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([])
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data).toEqual([])
  })
})

describe('POST /api/usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a usuario (ADMIN access)', async () => {
    // Mock that create returns only select fields (password excluded)
    vi.mocked(prisma.usuario.create).mockResolvedValue({
      id: 3,
      nombre: 'New User',
      email: 'new@test.com',
      rol: 'USUARIO',
      activo: true,
    } as any)

    const req = createPOSTRequest({
      nombre: 'New User',
      email: 'new@test.com',
      password: '123456',
      rol: 'USUARIO',
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.nombre).toBe('New User')
    // Password should NOT be in response
    expect(data.password).toBeUndefined()
  })

  it('returns 403 for non-ADMIN role', async () => {
    const req = createPOSTRequest({
      nombre: 'Test',
      email: 'test@test.com',
      password: '123456',
      rol: 'USUARIO',
    }, 'USUARIO')
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing required fields', async () => {
    const req = createPOSTRequest({ nombre: 'No Email' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
