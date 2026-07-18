import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import type { ApiError } from '@/types'

// GET /api/asignaciones/proyecto/[idProyecto] → list all Asignacion for a proyecto
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ idProyecto: string }> }
): Promise<NextResponse> {
  try {
    const { idProyecto } = await params
    const proyectoId = parseInt(idProyecto, 10)

    // Find all Asignacion through tareas belonging to the proyecto
    const asignaciones = await prisma.asignacion.findMany({
      where: {
        tarea: {
          proyectoId,
          activo: true,
        },
      },
      include: {
        tarea: {
          select: { id: true, nombre: true },
        },
        usuario: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { id: 'asc' },
    })

    const data = asignaciones.map((a) => ({
      id: a.id,
      horasEstimadas: Number(a.horasEstimadas),
      horasReales: Number(a.horasReales),
      tareaId: a.tareaId,
      usuarioId: a.usuarioId,
      nombreTarea: a.tarea.nombre,
      nombreUsuario: a.usuario.nombre,
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Asignaciones GET by proyecto error:', error)
    return NextResponse.json(
      { error: 'Error al obtener asignaciones del proyecto', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
