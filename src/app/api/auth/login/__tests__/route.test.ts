import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma BEFORE importing the route handler
vi.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    comparePassword: vi.fn(),
    signToken: vi.fn(),
  }
})

import { prisma } from '@/lib/prisma'
import { comparePassword, signToken } from '@/lib/auth'

// We'll test the logic by importing the POST handler
const { POST } = await import('@/app/api/auth/login/route')

function createRequest(body: unknown, headers?: Record<string, string>): Request {
  const req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
  return req
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with token for valid credentials', async () => {
    const mockUser = {
      id: 1,
      nombre: 'Admin',
      email: 'admin@test.com',
      password: '$2a$10$hashedpassword',
      rol: 'ADMINISTRADOR',
      activo: true,
    }

    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(comparePassword).mockResolvedValue(true)
    vi.mocked(signToken).mockResolvedValue('mock-jwt-token')

    const req = createRequest({ email: 'admin@test.com', password: '123456' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.token).toBe('mock-jwt-token')
    expect(data.usuario.email).toBe('admin@test.com')
  })

  it('returns 401 for invalid credentials (user not found)', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null)

    const req = createRequest({ email: 'nonexist@test.com', password: '123456' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 for inactive user', async () => {
    const mockUser = {
      id: 2,
      nombre: 'Inactive',
      email: 'inactive@test.com',
      password: '$2a$10$hashed',
      rol: 'USUARIO',
      activo: false,
    }
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(mockUser as any)

    const req = createRequest({ email: 'inactive@test.com', password: '123456' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 400 for missing email or password', async () => {
    const req = createRequest({ email: 'test@test.com' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.code).toBe('INVALID_INPUT')
  })

  it('handles wrong password with 401', async () => {
    const mockUser = {
      id: 1,
      nombre: 'Admin',
      email: 'admin@test.com',
      password: '$2a$10$hashed',
      rol: 'ADMINISTRADOR',
      activo: true,
    }
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(comparePassword).mockResolvedValue(false)

    const req = createRequest({ email: 'admin@test.com', password: 'wrong' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.code).toBe('INVALID_CREDENTIALS')
  })
})
