import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import type { ApiError } from '@/types'

// GET /api/dependencias/proyecto/[idProyecto] → list all dependencias for a proyecto
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ idProyecto: string }> }
): Promise<NextResponse> {
  try {
    const { idProyecto } = await params
    const proyectoId = parseInt(idProyecto, 10)

    // Find all tareas for the proyecto, then find dependencias for those tareas
    const dependencias = await prisma.dependenciaTarea.findMany({
      where: {
        OR: [
          { tareaOrigen: { proyectoId } },
          { tareaDestino: { proyectoId } },
        ],
      },
      include: {
        tareaOrigen: { select: { id: true, nombre: true } },
        tareaDestino: { select: { id: true, nombre: true } },
      },
      orderBy: { id: 'asc' },
    })

    const data = dependencias.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      tareaOrigenId: d.tareaOrigenId,
      tareaDestinoId: d.tareaDestinoId,
      nombreTareaOrigen: d.tareaOrigen.nombre,
      nombreTareaDestino: d.tareaDestino.nombre,
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Dependencias GET by proyecto error:', error)
    return NextResponse.json(
      { error: 'Error al obtener dependencias del proyecto', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
