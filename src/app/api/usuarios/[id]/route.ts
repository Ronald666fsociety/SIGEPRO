import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders, hashPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'
import type { ApiError } from '@/types'

// GET /api/usuarios/[id] → get single usuario
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const usuarioId = parseInt(id, 10)

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    })

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json(usuario)
  } catch (error) {
    console.error('Usuarios GET single error:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// PUT /api/usuarios/[id] → update usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = getUserFromHeaders(request.headers)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    requireRole(['ADMINISTRADOR'], user.rol)

    const { id } = await params
    const usuarioId = parseInt(id, 10)
    const body = await request.json()

    const existing = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!existing || !existing.activo) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // ── Validate email if changed ──
    if (body.email && body.email !== existing.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'El formato del email no es válido', code: 'INVALID_EMAIL' },
          { status: 422 }
        )
      }
    }

    // ── Validate password length if provided ──
    if (body.password && body.password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres', code: 'INVALID_PASSWORD' },
        { status: 422 }
      )
    }

    // ── Build update data ──
    const updateData: any = {}
    if (body.nombre !== undefined) updateData.nombre = body.nombre
    if (body.email !== undefined) updateData.email = body.email
    if (body.rol !== undefined) updateData.rol = body.rol
    if (body.password) {
      updateData.password = await hashPassword(body.password)
    }

    const updated = await prisma.usuario.update({
      where: { id: usuarioId },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    })

    await logAudit('Usuario', updated.id, 'ACTUALIZAR', user.id, `Actualización del usuario ${updated.nombre}`)

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email', code: 'DUPLICATE_EMAIL' },
        { status: 422 }
      )
    }
    console.error('Usuarios PUT error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar usuario', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// DELETE /api/usuarios/[id] → soft-delete (set activo = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = getUserFromHeaders(request.headers)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    requireRole(['ADMINISTRADOR'], user.rol)

    const { id } = await params
    const usuarioId = parseInt(id, 10)

    // Prevent self-deletion
    if (usuarioId === user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminarte a ti mismo', code: 'SELF_DELETE' },
        { status: 400 }
      )
    }

    const existing = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!existing || !existing.activo) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { activo: false },
    })

    await logAudit('Usuario', usuarioId, 'ELIMINAR', user.id, `Eliminación (soft) del usuario ${existing.nombre}`)

    return NextResponse.json({ message: 'Usuario eliminado correctamente' })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Usuarios DELETE error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar usuario', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
