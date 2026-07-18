import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getUserFromHeaders } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import type { ApiError, PaginatedResponse, Auditoria } from '@/types'

// GET /api/auditoria → paginated audit log viewer (ADMIN-only)
export async function GET(
  request: NextRequest
): Promise<NextResponse<PaginatedResponse<Auditoria> | ApiError>> {
  try {
    const user = getUserFromHeaders(request.headers)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    requireRole(['ADMINISTRADOR'], user.rol)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '100', 10)
    const entidad = searchParams.get('entidad')
    const entidadId = searchParams.get('entidadId')
    const usuarioId = searchParams.get('usuarioId')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    // ── Build filters ──
    const where: Record<string, unknown> = {}

    if (entidad) {
      where.entidad = entidad
    }
    if (entidadId) {
      where.entidadId = parseInt(entidadId, 10)
    }
    if (usuarioId) {
      where.usuarioId = parseInt(usuarioId, 10)
    }
    if (fechaDesde || fechaHasta) {
      const fechaFilter: Record<string, Date> = {}
      if (fechaDesde) {
        fechaFilter.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        fechaFilter.lte = new Date(fechaHasta + 'T23:59:59.999Z')
      }
      where.fecha = fechaFilter
    }

    // ── Count total ──
    const total = await prisma.auditoria.count({ where })

    // ── Fetch paginated results ──
    const registros = await prisma.auditoria.findMany({
      where,
      include: {
        usuario: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { fecha: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const data: Auditoria[] = registros.map((r) => ({
      id: r.id,
      entidad: r.entidad,
      entidadId: r.entidadId,
      accion: r.accion,
      detalle: r.detalle,
      fecha: r.fecha.toISOString(),
      usuarioId: r.usuarioId,
      nombreUsuario: r.usuario.nombre,
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Auditoria GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener registros de auditoría', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
