import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { detectaCiclo } from '@/lib/ciclico'

// POST /api/dependencias → create dependencia
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
    const { tareaOrigenId, tareaDestinoId, tipo } = body

    // ── Validate required fields ──
    if (!tareaOrigenId || !tareaDestinoId || !tipo) {
      return NextResponse.json(
        { error: 'Tarea origen, tarea destino y tipo son requeridos', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    const origenId = parseInt(tareaOrigenId, 10)
    const destinoId = parseInt(tareaDestinoId, 10)

    // ── Validate tareas exist ──
    const tareaOrigen = await prisma.tarea.findUnique({ where: { id: origenId } })
    const tareaDestino = await prisma.tarea.findUnique({ where: { id: destinoId } })

    if (!tareaOrigen || !tareaOrigen.activo) {
      return NextResponse.json(
        { error: 'La tarea de origen no existe', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    if (!tareaDestino || !tareaDestino.activo) {
      return NextResponse.json(
        { error: 'La tarea de destino no existe', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // ── Validate same proyecto ──
    if (tareaOrigen.proyectoId !== tareaDestino.proyectoId) {
      return NextResponse.json(
        { error: 'Las tareas deben pertenecer al mismo proyecto', code: 'DIFFERENT_PROJECT' },
        { status: 400 }
      )
    }

    // ── Cycle detection ──
    const tieneCiclo = await detectaCiclo(origenId, destinoId)
    if (tieneCiclo) {
      return NextResponse.json(
        { error: 'La dependencia crearía un ciclo', code: 'CYCLE_DETECTED' },
        { status: 422 }
      )
    }

    // ── Create dependencia ──
    const dependencia = await prisma.dependenciaTarea.create({
      data: {
        tareaOrigenId: origenId,
        tareaDestinoId: destinoId,
        tipo,
      },
      include: {
        tareaOrigen: { select: { id: true, nombre: true } },
        tareaDestino: { select: { id: true, nombre: true } },
      },
    })

    await logAudit(
      'DependenciaTarea',
      dependencia.id,
      'CREAR',
      user.id,
      `Dependencia ${tipo}: ${tareaOrigen.nombre} → ${tareaDestino.nombre}`
    )

    return NextResponse.json(
      {
        id: dependencia.id,
        tipo: dependencia.tipo,
        tareaOrigenId: dependencia.tareaOrigenId,
        tareaDestinoId: dependencia.tareaDestinoId,
        nombreTareaOrigen: dependencia.tareaOrigen.nombre,
        nombreTareaDestino: dependencia.tareaDestino.nombre,
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
    // Handle unique constraint violation gracefully
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una dependencia entre estas tareas', code: 'DUPLICATE_DEPENDENCY' },
        { status: 422 }
      )
    }
    console.error('Dependencias POST error:', error)
    return NextResponse.json(
      { error: 'Error al crear dependencia', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
