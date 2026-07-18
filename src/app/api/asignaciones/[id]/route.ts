import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'

// PUT /api/asignaciones/[id] → update Asignacion
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
    requireRole(['ADMINISTRADOR', 'JEFE_PROYECTO'], user.rol)

    const { id } = await params
    const asignacionId = parseInt(id, 10)
    const body = await request.json()

    const existing = await prisma.asignacion.findUnique({
      where: { id: asignacionId },
      include: {
        tarea: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Asignación no encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const updated = await prisma.asignacion.update({
      where: { id: asignacionId },
      data: {
        ...(body.horasEstimadas !== undefined && { horasEstimadas: parseFloat(body.horasEstimadas) }),
        ...(body.horasReales !== undefined && { horasReales: parseFloat(body.horasReales) }),
      },
      include: {
        tarea: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    })

    await logAudit(
      'Asignacion',
      updated.id,
      'ACTUALIZAR',
      user.id,
      `Actualización de asignación: ${existing.usuario.nombre} en "${existing.tarea.nombre}"`
    )

    return NextResponse.json({
      id: updated.id,
      horasEstimadas: Number(updated.horasEstimadas),
      horasReales: Number(updated.horasReales),
      tareaId: updated.tareaId,
      usuarioId: updated.usuarioId,
      nombreTarea: updated.tarea.nombre,
      nombreUsuario: updated.usuario.nombre,
    })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Asignaciones PUT error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar asignación', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// DELETE /api/asignaciones/[id] → delete Asignacion
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
    requireRole(['ADMINISTRADOR', 'JEFE_PROYECTO'], user.rol)

    const { id } = await params
    const asignacionId = parseInt(id, 10)

    const existing = await prisma.asignacion.findUnique({
      where: { id: asignacionId },
      include: {
        tarea: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Asignación no encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    await prisma.asignacion.delete({
      where: { id: asignacionId },
    })

    await logAudit(
      'Asignacion',
      asignacionId,
      'ELIMINAR',
      user.id,
      `Eliminación de asignación: ${existing.usuario.nombre} de tarea "${existing.tarea.nombre}"`
    )

    return NextResponse.json({ message: 'Asignación eliminada correctamente' })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Asignaciones DELETE error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar asignación', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
