import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import bcrypt from 'bcryptjs'
import type { JwtPayload, RolUsuario } from '@/types'

// ── Configuration ──

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

const TOKEN_EXPIRY = '24h'

// ── Sign / Verify ──

export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret())
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ['HS256'],
  })
  return payload as unknown as JwtPayload
}

// ── Password hashing ──

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── Role guard (for route handlers) ──

export function requireRole(allowedRoles: RolUsuario[], userRole: RolUsuario): void {
  if (!allowedRoles.includes(userRole)) {
    const error = new Error('Acceso denegado: rol insuficiente')
    error.name = 'ForbiddenError'
    throw error
  }
}

// ── Extract user from request headers (set by middleware) ──

export function getUserFromHeaders(
  headers: Headers
): { id: number; nombre: string; email: string; rol: RolUsuario } | null {
  const userId = headers.get('x-user-id')
  const userRol = headers.get('x-user-role')
  const userNombre = headers.get('x-user-nombre')
  const userEmail = headers.get('x-user-email')

  if (!userId || !userRol || !userNombre || !userEmail) {
    return null
  }

  return {
    id: parseInt(userId, 10),
    nombre: userNombre,
    email: userEmail,
    rol: userRol as RolUsuario,
  }
}
