import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'

// DELETE /api/dependencias/[id] → delete dependencia
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
    const dependenciaId = parseInt(id, 10)

    const existing = await prisma.dependenciaTarea.findUnique({
      where: { id: dependenciaId },
      include: {
        tareaOrigen: { select: { nombre: true } },
        tareaDestino: { select: { nombre: true } },
      },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Dependencia no encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    await prisma.dependenciaTarea.delete({
      where: { id: dependenciaId },
    })

    await logAudit(
      'DependenciaTarea',
      dependenciaId,
      'ELIMINAR',
      user.id,
      `Eliminación de dependencia: ${existing.tareaOrigen.nombre} → ${existing.tareaDestino.nombre}`
    )

    return NextResponse.json({ message: 'Dependencia eliminada correctamente' })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Dependencias DELETE error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar dependencia', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
