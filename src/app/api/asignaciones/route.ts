import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// POST /api/asignaciones → create Asignacion
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
    const { tareaId, usuarioId, horasEstimadas, horasReales } = body

    // ── Validate required fields ──
    if (!tareaId || !usuarioId) {
      return NextResponse.json(
        { error: 'Tarea y usuario son requeridos', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    const tareaIdNum = parseInt(tareaId, 10)
    const usuarioIdNum = parseInt(usuarioId, 10)

    // ── Validate tarea exists ──
    const tarea = await prisma.tarea.findUnique({
      where: { id: tareaIdNum },
      include: { proyecto: { select: { id: true, nombre: true } } },
    })
    if (!tarea || !tarea.activo) {
      return NextResponse.json(
        { error: 'La tarea especificada no existe', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // ── Validate usuario exists ──
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioIdNum },
    })
    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: 'El usuario especificado no existe', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // ── Create asignacion ──
    const asignacion = await prisma.asignacion.create({
      data: {
        horasEstimadas: parseFloat(horasEstimadas ?? '0'),
        horasReales: parseFloat(horasReales ?? '0'),
        tareaId: tareaIdNum,
        usuarioId: usuarioIdNum,
      },
      include: {
        tarea: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    })

    await logAudit(
      'Asignacion',
      asignacion.id,
      'CREAR',
      user.id,
      `Asignación de ${usuario.nombre} a tarea "${tarea.nombre}"`
    )

    return NextResponse.json(
      {
        id: asignacion.id,
        horasEstimadas: Number(asignacion.horasEstimadas),
        horasReales: Number(asignacion.horasReales),
        tareaId: asignacion.tareaId,
        usuarioId: asignacion.usuarioId,
        nombreTarea: asignacion.tarea.nombre,
        nombreUsuario: asignacion.usuario.nombre,
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
    console.error('Asignaciones POST error:', error)
    return NextResponse.json(
      { error: 'Error al crear asignación', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
