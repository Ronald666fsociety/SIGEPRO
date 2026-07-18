import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { recalcularTotales } from '@/lib/totales'
import type { NextRequest } from 'next/server'

// PUT /api/tareas/[id] → update tarea fields
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
    // USUARIO can only update avance/progress; ADMIN and JEFE_PROYECTO can update all fields
    const isAdminOrJefe = ['ADMINISTRADOR', 'JEFE_PROYECTO'].includes(user.rol)
    if (!isAdminOrJefe && user.rol !== 'USUARIO') {
      return NextResponse.json(
        { error: 'Acceso denegado: rol insuficiente', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const { id } = await params
    const tareaId = parseInt(id, 10)
    const body = await request.json()

    const existing = await prisma.tarea.findUnique({
      where: { id: tareaId },
      include: { proyecto: { select: { id: true, nombre: true } } },
    })
    if (!existing || !existing.activo) {
      return NextResponse.json(
        { error: 'Tarea no encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // USUARIO role can only update progreso
    if (user.rol === 'USUARIO') {
      const allowedKeys = ['progreso']
      const attemptedKeys = Object.keys(body)
      const hasDisallowedKeys = attemptedKeys.some((k) => !allowedKeys.includes(k))
      if (hasDisallowedKeys) {
        return NextResponse.json(
          { error: 'Los usuarios solo pueden actualizar el progreso de la tarea', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }
    }

    // ── Validate fechaFin > fechaInicio if both provided (in body or existing) ──
    const fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : existing.fechaInicio
    const fechaFin = body.fechaFin ? new Date(body.fechaFin) : existing.fechaFin
    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio', code: 'INVALID_DATES' },
        { status: 422 }
      )
    }

    // ── Validate tareaPadre if changed ──
    if (body.tareaPadreId !== undefined && body.tareaPadreId !== null) {
      const tareaPadreIdNum = parseInt(body.tareaPadreId, 10)
      if (tareaPadreIdNum === tareaId) {
        return NextResponse.json(
          { error: 'Una tarea no puede ser padre de sí misma', code: 'INVALID_INPUT' },
          { status: 400 }
        )
      }
      const tareaPadre = await prisma.tarea.findUnique({ where: { id: tareaPadreIdNum } })
      if (!tareaPadre || !tareaPadre.activo) {
        return NextResponse.json(
          { error: 'La tarea padre especificada no existe', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      if (tareaPadre.proyectoId !== existing.proyectoId) {
        return NextResponse.json(
          { error: 'La tarea padre debe pertenecer al mismo proyecto', code: 'INVALID_INPUT' },
          { status: 400 }
        )
      }
    }

    // ── Validate responsable if changed ──
    if (body.responsableId !== undefined && body.responsableId !== null) {
      const respId = parseInt(body.responsableId, 10)
      const responsable = await prisma.usuario.findUnique({ where: { id: respId } })
      if (!responsable || !responsable.activo) {
        return NextResponse.json(
          { error: 'El responsable especificado no existe', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
    }

    // ── Update ──
    const updated = await prisma.tarea.update({
      where: { id: tareaId },
      data: {
        ...(body.nombre !== undefined && { nombre: body.nombre }),
        ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
        ...(body.fechaInicio !== undefined && { fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null }),
        ...(body.fechaFin !== undefined && { fechaFin: body.fechaFin ? new Date(body.fechaFin) : null }),
        ...(body.progreso !== undefined && { progreso: parseInt(body.progreso, 10) }),
        ...(body.presupuestoEstimado !== undefined && { presupuestoEstimado: parseFloat(body.presupuestoEstimado) }),
        ...(body.costoEjecutado !== undefined && { costoEjecutado: parseFloat(body.costoEjecutado) }),
        ...(body.responsableId !== undefined && {
          responsableId: body.responsableId ? parseInt(body.responsableId, 10) : null,
        }),
        ...(body.tareaPadreId !== undefined && {
          tareaPadreId: body.tareaPadreId ? parseInt(body.tareaPadreId, 10) : null,
        }),
      },
      include: {
        proyecto: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
      },
    })

    // ── Recalcular totales ──
    await recalcularTotales(existing.proyectoId)

    await logAudit('Tarea', updated.id, 'ACTUALIZAR', user.id, `Actualización de la tarea ${updated.nombre}`)

    return NextResponse.json({
      id: updated.id,
      nombre: updated.nombre,
      descripcion: updated.descripcion,
      fechaInicio: updated.fechaInicio?.toISOString() ?? null,
      fechaFin: updated.fechaFin?.toISOString() ?? null,
      progreso: updated.progreso,
      presupuestoEstimado: Number(updated.presupuestoEstimado),
      costoEjecutado: Number(updated.costoEjecutado),
      activo: updated.activo,
      proyectoId: updated.proyectoId,
      tareaPadreId: updated.tareaPadreId,
      responsableId: updated.responsableId,
      responsableNombre: updated.responsable?.nombre ?? null,
    })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Tareas PUT error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar tarea', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// DELETE /api/tareas/[id] → delete tarea (prevent if has subtareas)
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
    const tareaId = parseInt(id, 10)

    const existing = await prisma.tarea.findUnique({
      where: { id: tareaId },
      include: {
        _count: { select: { tareasHijas: true } },
        proyecto: { select: { id: true, nombre: true } },
      },
    })
    if (!existing || !existing.activo) {
      return NextResponse.json(
        { error: 'Tarea no encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // ── Prevent deletion if has subtareas ──
    if (existing._count.tareasHijas > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una tarea que tiene subtareas', code: 'HAS_CHILDREN' },
        { status: 400 }
      )
    }

    // ── Delete dependencias referencing this tarea first ──
    await prisma.dependenciaTarea.deleteMany({
      where: {
        OR: [{ tareaOrigenId: tareaId }, { tareaDestinoId: tareaId }],
      },
    })

    // ── Delete asignaciones asociadas ──
    await prisma.asignacion.deleteMany({
      where: { tareaId },
    })

    // ── Delete the tarea ──
    await prisma.tarea.delete({
      where: { id: tareaId },
    })

    // ── Recalcular totales ──
    await recalcularTotales(existing.proyectoId)

    await logAudit('Tarea', tareaId, 'ELIMINAR', user.id, `Eliminación de la tarea ${existing.nombre}`)

    return NextResponse.json({ message: 'Tarea eliminada correctamente' })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Tareas DELETE error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar tarea', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
