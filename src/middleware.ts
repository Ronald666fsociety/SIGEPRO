import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// ── Configuration ──

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

// ── Rate limiting for login endpoint ──

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = RATE_LIMIT_MAP.get(ip)

  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count }
}

// Public paths that do not require authentication
const publicPaths = ['/api/auth/login']

// ── Middleware ──

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate limiting (login endpoint) ──
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? '127.0.0.1'

    const { allowed, remaining } = checkRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intente nuevamente en 15 minutos.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_WINDOW_MS / 1000) } }
      )
    }
    // Allow request to proceed
    return NextResponse.next()
  }

  // ── Bypass auth for public paths ──
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── Protected API routes ──
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token no proporcionado', code: 'MISSING_TOKEN' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)

    try {
      const { payload } = await jwtVerify(token, getJwtSecret(), {
        algorithms: ['HS256'],
      })

      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', String(payload.id))
      requestHeaders.set('x-user-role', String(payload.rol))
      requestHeaders.set('x-user-nombre', String(payload.nombre))
      requestHeaders.set('x-user-email', String(payload.email))

      return NextResponse.next({
        request: { headers: requestHeaders },
      })
    } catch {
      return NextResponse.json(
        { error: 'Token inválido o expirado', code: 'INVALID_TOKEN' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
