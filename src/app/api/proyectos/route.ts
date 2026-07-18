import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ApiError } from '@/types'
import type { Prisma } from '@prisma/client'

// GET /api/proyectos → list all active proyectos
export async function GET(): Promise<NextResponse> {
  try {
    const proyectos = await prisma.proyecto.findMany({
      where: { activo: true },
      include: {
        jefeProyecto: {
          select: { id: true, nombre: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = proyectos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      presupuestoTotal: Number(p.presupuestoTotal),
      costoRealTotal: Number(p.costoRealTotal),
      estado: p.estado,
      fechaInicio: p.fechaInicio?.toISOString() ?? null,
      fechaFin: p.fechaFin?.toISOString() ?? null,
      activo: p.activo,
      jefeProyectoId: p.jefeProyectoId,
      nombreJefeProyecto: p.jefeProyecto.nombre,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Proyectos GET list error:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyectos', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// POST /api/proyectos → create proyecto
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
    const { codigo, nombre, descripcion, presupuestoTotal, estado, fechaInicio, fechaFin, jefeProyectoId } = body

    // ── Validate required fields ──
    if (!codigo || !nombre || !jefeProyectoId) {
      return NextResponse.json(
        { error: 'Código, nombre y jefe de proyecto son requeridos', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    // ── Validate jefeProyecto exists ──
    const jefe = await prisma.usuario.findUnique({
      where: { id: parseInt(jefeProyectoId, 10) },
    })
    if (!jefe || !jefe.activo) {
      return NextResponse.json(
        { error: 'El jefe de proyecto especificado no existe', code: 'NOT_FOUND' },
        { status: 404 }
      )
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

    // ── Create proyecto ──
    const proyectoData: Prisma.ProyectoCreateInput = {
      codigo,
      nombre,
      descripcion: descripcion ?? null,
      presupuestoTotal: parseFloat(presupuestoTotal ?? '0'),
      estado: estado ?? 'PLANIFICADO',
      fechaInicio: fechaInicioDate,
      fechaFin: fechaFinDate,
      jefeProyecto: { connect: { id: parseInt(jefeProyectoId, 10) } },
    }

    const proyecto = await prisma.proyecto.create({ data: proyectoData })

    await logAudit('Proyecto', proyecto.id, 'CREAR', user.id, `Creación del proyecto ${nombre}`)

    return NextResponse.json(
      {
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
        createdAt: proyecto.createdAt.toISOString(),
        updatedAt: proyecto.updatedAt.toISOString(),
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
    // Handle Prisma unique constraint on codigo
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un proyecto con ese código', code: 'DUPLICATE_CODE' },
        { status: 422 }
      )
    }
    console.error('Proyectos POST error:', error)
    return NextResponse.json(
      { error: 'Error al crear proyecto', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
