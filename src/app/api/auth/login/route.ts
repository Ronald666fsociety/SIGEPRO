import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken } from '@/lib/auth'
import type { LoginRequest, LoginResponse, ApiError } from '@/types'

export async function POST(request: Request): Promise<NextResponse<LoginResponse | ApiError>> {
  try {
    const body: LoginRequest = await request.json()

    // ── Validate input ──
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    // ── Find user ──
    const usuario = await prisma.usuario.findUnique({
      where: { email: body.email },
    })

    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      )
    }

    // ── Verify password ──
    const passwordValid = await comparePassword(body.password, usuario.password)
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      )
    }

    // ── Sign JWT ──
    const token = await signToken({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    })

    return NextResponse.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
