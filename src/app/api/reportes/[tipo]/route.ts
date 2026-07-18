import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import type { ApiError } from '@/types'

// ── Response types ──

interface PresupuestoVsCosto {
  proyectoId: number
  proyecto: string
  presupuesto: number
  costoReal: number
  diferencia: number
  estado: 'DENTRO_PRESUPUESTO' | 'SOBRE_PRESUPUESTO'
}

interface Semaforo {
  proyectoId: number
  proyecto: string
  avanceReal: number
  avancePlanificado: number
  retrasoPorcentaje: number
  sobreCostoPorcentaje: number
  color: 'VERDE' | 'AMARILLO' | 'ROJO'
}

interface CargaTrabajoItem {
  usuario: string
  totalHorasEstimadas: number
  totalHorasReales: number
  tareas: string[]
}

// GET /api/reportes/[tipo] → computed reports
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
): Promise<NextResponse> {
  try {
    const { tipo } = await params

    switch (tipo) {
      case 'presupuesto-vs-costo':
        return await getPresupuestoVsCosto()
      case 'semaforo':
        return await getSemaforo()
      case 'carga-trabajo':
        return await getCargaTrabajo()
      default:
        return NextResponse.json(
          { error: 'Tipo de reporte no válido', code: 'INVALID_TYPE' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Reportes GET error:', error)
    return NextResponse.json(
      { error: 'Error al generar reporte', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

async function getPresupuestoVsCosto(): Promise<NextResponse> {
  const proyectos = await prisma.proyecto.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      presupuestoTotal: true,
      costoRealTotal: true,
    },
    orderBy: { nombre: 'asc' },
  })

  const data: PresupuestoVsCosto[] = proyectos.map((p) => {
    const presupuesto = Number(p.presupuestoTotal)
    const costoReal = Number(p.costoRealTotal)
    const diferencia = presupuesto - costoReal

    return {
      proyectoId: p.id,
      proyecto: p.nombre,
      presupuesto,
      costoReal,
      diferencia: Math.round(diferencia * 100) / 100,
      estado: diferencia >= 0 ? 'DENTRO_PRESUPUESTO' : 'SOBRE_PRESUPUESTO',
    }
  })

  return NextResponse.json(data)
}

async function getSemaforo(): Promise<NextResponse> {
  const proyectos = await prisma.proyecto.findMany({
    where: { activo: true },
    include: {
      tareas: {
        where: { activo: true },
        select: {
          progreso: true,
          fechaInicio: true,
          fechaFin: true,
        },
      },
    },
    orderBy: { nombre: 'asc' },
  })

  const data: Semaforo[] = proyectos.map((p) => {
    const now = new Date()
    const totalDuration = p.fechaFin && p.fechaInicio
      ? p.fechaFin.getTime() - p.fechaInicio.getTime()
      : 0
    const elapsed = p.fechaInicio
      ? now.getTime() - p.fechaInicio.getTime()
      : 0

    // Avance planificado based on time elapsed
    const avancePlanificado = totalDuration > 0
      ? Math.min(100, Math.round((elapsed / totalDuration) * 100))
      : 0

    // Avance real: simple average of tareas progreso
    const tareasCount = p.tareas.length
    const avanceReal = tareasCount > 0
      ? Math.round(
          p.tareas.reduce((sum, t) => sum + t.progreso, 0) / tareasCount
        )
      : 0

    const retrasoPorcentaje = avancePlanificado - avanceReal

    // Color: VERDE [0,10), AMARILLO [10,30], ROJO (30,∞)
    let color: 'VERDE' | 'AMARILLO' | 'ROJO'
    if (retrasoPorcentaje < 10) {
      color = 'VERDE'
    } else if (retrasoPorcentaje <= 30) {
      color = 'AMARILLO'
    } else {
      color = 'ROJO'
    }

    return {
      proyectoId: p.id,
      proyecto: p.nombre,
      avanceReal,
      avancePlanificado,
      retrasoPorcentaje,
      sobreCostoPorcentaje: 0,
      color,
    }
  })

  return NextResponse.json(data)
}

async function getCargaTrabajo(): Promise<NextResponse> {
  // Group Asignacion by usuario across all active proyectos
  const asignaciones = await prisma.asignacion.findMany({
    where: {
      tarea: {
        activo: true,
        proyecto: { activo: true },
      },
    },
    include: {
      tarea: {
        select: { nombre: true },
      },
      usuario: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: { usuarioId: 'asc' },
  })

  // Group by usuario nombre
  const grouped = new Map<
    string,
    { usuario: string; totalHorasEstimadas: number; totalHorasReales: number; tareas: Set<string> }
  >()
  for (const a of asignaciones) {
    const key = a.usuario.nombre
    const existing = grouped.get(key) ?? {
      usuario: a.usuario.nombre,
      totalHorasEstimadas: 0,
      totalHorasReales: 0,
      tareas: new Set<string>(),
    }
    existing.totalHorasEstimadas += Number(a.horasEstimadas)
    existing.totalHorasReales += Number(a.horasReales)
    existing.tareas.add(a.tarea.nombre)
    grouped.set(key, existing)
  }

  const data: CargaTrabajoItem[] = Array.from(grouped.values()).map((info) => ({
    usuario: info.usuario,
    totalHorasEstimadas: Math.round(info.totalHorasEstimadas * 100) / 100,
    totalHorasReales: Math.round(info.totalHorasReales * 100) / 100,
    tareas: Array.from(info.tareas),
  }))

  return NextResponse.json(data)
}
