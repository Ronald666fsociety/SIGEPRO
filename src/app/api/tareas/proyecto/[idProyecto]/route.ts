import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import type { ApiError } from '@/types'

// GET /api/tareas/proyecto/[idProyecto] → list all tareas for a proyecto
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ idProyecto: string }> }
): Promise<NextResponse> {
  try {
    const { idProyecto } = await params
    const proyectoId = parseInt(idProyecto, 10)

    const tareas = await prisma.tarea.findMany({
      where: {
        proyectoId,
        activo: true,
      },
      orderBy: [{ tareaPadreId: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
      include: {
        proyecto: {
          select: { id: true, nombre: true, codigo: true },
        },
        responsable: {
          select: { id: true, nombre: true },
        },
      },
    })

    const data = tareas.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      descripcion: t.descripcion,
      fechaInicio: t.fechaInicio?.toISOString() ?? null,
      fechaFin: t.fechaFin?.toISOString() ?? null,
      progreso: t.progreso,
      presupuestoEstimado: Number(t.presupuestoEstimado),
      costoEjecutado: Number(t.costoEjecutado),
      activo: t.activo,
      proyectoId: t.proyectoId,
      tareaPadreId: t.tareaPadreId,
      responsableId: t.responsableId,
      responsableNombre: t.responsable?.nombre ?? null,
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Tareas GET by proyecto error:', error)
    return NextResponse.json(
      { error: 'Error al obtener tareas del proyecto', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
