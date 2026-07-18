import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { NextRequest } from 'next/server'
import type { ApiError } from '@/types'

// GET /api/proyectos/[id] → get single proyecto
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const proyectoId = parseInt(id, 10)

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        jefeProyecto: {
          select: { id: true, nombre: true, email: true },
        },
      },
    })

    if (!proyecto || !proyecto.activo) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: proyecto.id,
      codigo: proyecto.codigo,
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion,
      presupuestoTotal: Number(proyecto.presupuestoTotal),
      costoRealTotal: Number(proyecto.costoRealTotal),
      estado: proyecto.estado,
      fechaInicio: proyecto.fechaInicio?.toISOString() ?? null,
      fechaFin: proyecto.fechaFin?.toISOString() ?? null,
      activo: proyecto.activo,
      jefeProyectoId: proyecto.jefeProyectoId,
      nombreJefeProyecto: proyecto.jefeProyecto.nombre,
      createdAt: proyecto.createdAt.toISOString(),
      updatedAt: proyecto.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Proyectos GET single error:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyecto', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// PUT /api/proyectos/[id] → update proyecto
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
    const proyectoId = parseInt(id, 10)
    const body = await request.json()

    const existing = await prisma.proyecto.findUnique({ where: { id: proyectoId } })
    if (!existing || !existing.activo) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // ── Validate fechaFin > fechaInicio if both provided ──
    const fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : existing.fechaInicio
    const fechaFin = body.fechaFin ? new Date(body.fechaFin) : existing.fechaFin
    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio', code: 'INVALID_DATES' },
        { status: 422 }
      )
    }

    // ── Validate jefeProyecto if changed ──
    if (body.jefeProyectoId) {
      const jefe = await prisma.usuario.findUnique({
        where: { id: parseInt(body.jefeProyectoId, 10) },
      })
      if (!jefe || !jefe.activo) {
        return NextResponse.json(
          { error: 'El jefe de proyecto especificado no existe', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
    }

    const updated = await prisma.proyecto.update({
      where: { id: proyectoId },
      data: {
        ...(body.codigo !== undefined && { codigo: body.codigo }),
        ...(body.nombre !== undefined && { nombre: body.nombre }),
        ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
        ...(body.presupuestoTotal !== undefined && { presupuestoTotal: parseFloat(body.presupuestoTotal) }),
        ...(body.estado !== undefined && { estado: body.estado }),
        ...(body.fechaInicio !== undefined && { fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null }),
        ...(body.fechaFin !== undefined && { fechaFin: body.fechaFin ? new Date(body.fechaFin) : null }),
        ...(body.jefeProyectoId !== undefined && {
          jefeProyecto: { connect: { id: parseInt(body.jefeProyectoId, 10) } },
        }),
      },
      include: {
        jefeProyecto: {
          select: { id: true, nombre: true, email: true },
        },
      },
    })

    await logAudit('Proyecto', updated.id, 'ACTUALIZAR', user.id, `Actualización del proyecto ${updated.nombre}`)

    return NextResponse.json({
      id: updated.id,
      codigo: updated.codigo,
      nombre: updated.nombre,
      descripcion: updated.descripcion,
      presupuestoTotal: Number(updated.presupuestoTotal),
      costoRealTotal: Number(updated.costoRealTotal),
      estado: updated.estado,
      fechaInicio: updated.fechaInicio?.toISOString() ?? null,
      fechaFin: updated.fechaFin?.toISOString() ?? null,
      activo: updated.activo,
      jefeProyectoId: updated.jefeProyectoId,
      nombreJefeProyecto: updated.jefeProyecto.nombre,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un proyecto con ese código', code: 'DUPLICATE_CODE' },
        { status: 422 }
      )
    }
    console.error('Proyectos PUT error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar proyecto', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// DELETE /api/proyectos/[id] → soft-delete (set activo = false)
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
    const proyectoId = parseInt(id, 10)

    const existing = await prisma.proyecto.findUnique({ where: { id: proyectoId } })
    if (!existing || !existing.activo) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    await prisma.proyecto.update({
      where: { id: proyectoId },
      data: { activo: false },
    })

    await logAudit('Proyecto', proyectoId, 'ELIMINAR', user.id, `Eliminación (soft) del proyecto ${existing.nombre}`)

    return NextResponse.json({ message: 'Proyecto eliminado correctamente' })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Proyectos DELETE error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar proyecto', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
