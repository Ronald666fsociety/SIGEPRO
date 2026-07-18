import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import type { ApiError } from '@/types'

export interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies: string
  tareaPadreId: number | null
  responsableNombre: string | null
  presupuestoEstimado: number
  costoEjecutado: number
  estado: 'COMPLETADA' | 'EN_CURSO' | 'PENDIENTE'
}

export interface GanttResponse {
  tasks: GanttTask[]
}

// GET /api/gantt/proyecto/[idProyecto] → tasks formatted for Gantt engine
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ idProyecto: string }> }
): Promise<NextResponse<GanttResponse | ApiError>> {
  try {
    const { idProyecto } = await params
    const proyectoId = parseInt(idProyecto, 10)

    // ── Fetch all tareas for the proyecto with responsable info ──
    const tareas = await prisma.tarea.findMany({
      where: {
        proyectoId,
        activo: true,
      },
      include: {
        responsable: {
          select: { nombre: true },
        },
      },
      orderBy: [{ fechaInicio: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
    })

    // ── Fetch dependencies for this project ──
    const dependencias = await prisma.dependenciaTarea.findMany({
      where: {
        OR: [
          { tareaOrigen: { proyectoId } },
          { tareaDestino: { proyectoId } },
        ],
      },
      select: {
        tareaOrigenId: true,
        tareaDestinoId: true,
      },
    })

    // Build dependency map: tareaDestinoId → [tareaOrigenId, ...]
    const depMap = new Map<number, string[]>()
    for (const dep of dependencias) {
      const existing = depMap.get(dep.tareaDestinoId) ?? []
      existing.push(String(dep.tareaOrigenId))
      depMap.set(dep.tareaDestinoId, existing)
    }

    const tasks: GanttTask[] = tareas.map((t) => {
      const deps = depMap.get(t.id)
      const prog = t.progreso ?? 0

      let estado: 'COMPLETADA' | 'EN_CURSO' | 'PENDIENTE' = 'PENDIENTE'
      if (prog >= 100) {
        estado = 'COMPLETADA'
      } else if (prog > 0) {
        estado = 'EN_CURSO'
      }

      return {
        id: String(t.id),
        name: t.nombre,
        start: t.fechaInicio
          ? formatDate(t.fechaInicio)
          : formatDate(new Date()),
        end: t.fechaFin
          ? formatDate(t.fechaFin)
          : formatDate(addDays(t.fechaInicio ?? new Date(), 7)),
        progress: prog,
        dependencies: deps ? deps.join(', ') : '',
        tareaPadreId: t.tareaPadreId,
        responsableNombre: t.responsable?.nombre ?? null,
        presupuestoEstimado: Number(t.presupuestoEstimado),
        costoEjecutado: Number(t.costoEjecutado),
        estado,
      }
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Gantt GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos del diagrama Gantt', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
