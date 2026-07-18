import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { recalcularTotales } from '@/lib/totales'

// POST /api/tareas → create tarea
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = getUserFromHeaders(request.headers)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    requireRole(['ADMINISTRADOR', 'JEFE_PROYECTO'], user.rol)

    const body = await request.json()
    const {
      nombre,
      descripcion,
      fechaInicio,
      fechaFin,
      presupuestoEstimado,
      costoEjecutado,
      responsableId,
      proyectoId,
      tareaPadreId,
    } = body

    // ── Validate required fields ──
    if (!nombre || !proyectoId) {
      return NextResponse.json(
        { error: 'Nombre y proyecto son requeridos', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    const proyectoIdNum = parseInt(proyectoId, 10)

    // ── Validate proyecto exists ──
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoIdNum },
    })
    if (!proyecto || !proyecto.activo) {
      return NextResponse.json(
        { error: 'El proyecto especificado no existe', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // ── Validate optional tareaPadre ──
    if (tareaPadreId) {
      const tareaPadre = await prisma.tarea.findUnique({
        where: { id: parseInt(tareaPadreId, 10) },
      })
      if (!tareaPadre || !tareaPadre.activo) {
        return NextResponse.json(
          { error: 'La tarea padre especificada no existe', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      if (tareaPadre.proyectoId !== proyectoIdNum) {
        return NextResponse.json(
          { error: 'La tarea padre debe pertenecer al mismo proyecto', code: 'INVALID_INPUT' },
          { status: 400 }
        )
      }
    }

    // ── Validate optional responsable ──
    if (responsableId) {
      const respId = parseInt(responsableId, 10)
      const responsable = await prisma.usuario.findUnique({ where: { id: respId } })
      if (!responsable || !responsable.activo) {
        return NextResponse.json(
          { error: 'El responsable especificado no existe', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
    }

    // ── Validate fechaFin > fechaInicio if both provided ──
    const fechaInicioDate = fechaInicio ? new Date(fechaInicio) : null
    const fechaFinDate = fechaFin ? new Date(fechaFin) : null
    if (fechaInicioDate && fechaFinDate && fechaFinDate <= fechaInicioDate) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio', code: 'INVALID_DATES' },
        { status: 422 }
      )
    }

    // ── Create tarea ──
    const tarea = await prisma.tarea.create({
      data: {
        nombre,
        descripcion: descripcion ?? null,
        fechaInicio: fechaInicioDate,
        fechaFin: fechaFinDate,
        presupuestoEstimado: presupuestoEstimado ? parseFloat(presupuestoEstimado) : 0,
        costoEjecutado: costoEjecutado ? parseFloat(costoEjecutado) : 0,
        proyectoId: proyectoIdNum,
        ...(tareaPadreId ? { tareaPadreId: parseInt(tareaPadreId, 10) } : {}),
        ...(responsableId ? { responsableId: parseInt(responsableId, 10) } : {}),
      },
      include: {
        proyecto: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
      },
    })

    // ── Recalcular totales del proyecto ──
    await recalcularTotales(proyectoIdNum)

    await logAudit('Tarea', tarea.id, 'CREAR', user.id, `Creación de la tarea ${nombre} en proyecto ${proyecto.nombre}`)

    return NextResponse.json(
      {
        id: tarea.id,
        nombre: tarea.nombre,
        descripcion: tarea.descripcion,
        fechaInicio: tarea.fechaInicio?.toISOString() ?? null,
        fechaFin: tarea.fechaFin?.toISOString() ?? null,
        progreso: tarea.progreso,
        presupuestoEstimado: Number(tarea.presupuestoEstimado),
        costoEjecutado: Number(tarea.costoEjecutado),
        activo: tarea.activo,
        proyectoId: tarea.proyectoId,
        tareaPadreId: tarea.tareaPadreId,
        responsableId: tarea.responsableId,
        responsableNombre: tarea.responsable?.nombre ?? null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Tareas POST error:', error)
    return NextResponse.json(
      { error: 'Error al crear tarea', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
