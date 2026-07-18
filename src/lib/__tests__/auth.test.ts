import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireRole } from '@/lib/auth'

// signToken and verifyToken use jose which needs JWT_SECRET env var
// hashPassword and comparePassword use bcryptjs which is CPU-heavy
// We test requireRole as a pure function guard

describe('requireRole', () => {
  it('does not throw when role is in allowed list', () => {
    expect(() => requireRole(['ADMINISTRADOR'], 'ADMINISTRADOR')).not.toThrow()
    expect(() => requireRole(['ADMINISTRADOR', 'JEFE_PROYECTO'], 'JEFE_PROYECTO')).not.toThrow()
    expect(() => requireRole(['USUARIO'], 'USUARIO')).not.toThrow()
  })

  it('throws ForbiddenError when role is not in allowed list', () => {
    expect(() => requireRole(['ADMINISTRADOR'], 'USUARIO')).toThrow('Acceso denegado: rol insuficiente')
    expect(() => requireRole(['JEFE_PROYECTO'], 'USUARIO')).toThrow('Acceso denegado: rol insuficiente')
  })

  it('throws ForbiddenError for empty allowed list', () => {
    expect(() => requireRole([], 'ADMINISTRADOR')).toThrow('Acceso denegado: rol insuficiente')
  })
})

describe('signToken and verifyToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing'
  })

  it('signToken returns a string and verifyToken returns payload', async () => {
    const { signToken, verifyToken } = await import('@/lib/auth')

    const payload = { id: 1, nombre: 'Test', email: 'test@test.com', rol: 'ADMINISTRADOR' as const }
    const token = await signToken(payload)

    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT has 3 parts

    const verified = await verifyToken(token)
    expect(verified.id).toBe(1)
    expect(verified.nombre).toBe('Test')
    expect(verified.email).toBe('test@test.com')
    expect(verified.rol).toBe('ADMINISTRADOR')
  })

  it('verifyToken throws on invalid token', async () => {
    const { verifyToken } = await import('@/lib/auth')
    await expect(verifyToken('invalid-token')).rejects.toThrow()
  })
})

describe('hashPassword and comparePassword', () => {
  it('hashPassword produces different hashes each time', async () => {
    const { hashPassword } = await import('@/lib/auth')
    const password = 'testPassword123'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)
    expect(hash1).not.toBe(hash2)
  })

  it('comparePassword verifies correct password', async () => {
    const { hashPassword, comparePassword } = await import('@/lib/auth')
    const password = 'testPassword123'
    const hash = await hashPassword(password)
    const result = await comparePassword(password, hash)
    expect(result).toBe(true)
  })

  it('comparePassword rejects incorrect password', async () => {
    const { hashPassword, comparePassword } = await import('@/lib/auth')
    const hash = await hashPassword('correctPassword')
    const result = await comparePassword('wrongPassword', hash)
    expect(result).toBe(false)
  })
})
