import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders, hashPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ApiError } from '@/types'

// GET /api/usuarios → list all active usuarios
export async function GET(): Promise<NextResponse> {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    console.error('Usuarios GET list error:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuarios', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// POST /api/usuarios → create usuario (ADMIN-only)
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = getUserFromHeaders(request.headers)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    requireRole(['ADMINISTRADOR'], user.rol)

    const body = await request.json()
    const { nombre, email, password, rol } = body

    // ── Validate required fields ──
    if (!nombre || !email || !password || !rol) {
      return NextResponse.json(
        { error: 'Nombre, email, contraseña y rol son requeridos', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    // ── Validate password length ──
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres', code: 'INVALID_PASSWORD' },
        { status: 422 }
      )
    }

    // ── Validate email format ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'El formato del email no es válido', code: 'INVALID_EMAIL' },
        { status: 422 }
      )
    }

    // ── Hash password ──
    const hashedPassword = await hashPassword(password)

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    })

    await logAudit('Usuario', usuario.id, 'CREAR', user.id, `Creación del usuario ${nombre}`)

    return NextResponse.json(usuario, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    // Handle unique constraint violation on email
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email', code: 'DUPLICATE_EMAIL' },
        { status: 422 }
      )
    }
    console.error('Usuarios POST error:', error)
    return NextResponse.json(
      { error: 'Error al crear usuario', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
