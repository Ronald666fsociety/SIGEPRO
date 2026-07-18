export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromHeaders, requireRole } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'

// GET /api/exportar/excel/[tipo]/[id] → export Excel for: plan_proyecto/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tipo: string; id: string }> }
): Promise<NextResponse> {
  try {
    const user = getUserFromHeaders(_request.headers)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    requireRole(['ADMINISTRADOR', 'JEFE_PROYECTO'], user.rol)

    const { tipo, id } = await params

    if (tipo !== 'plan_proyecto') {
      return NextResponse.json(
        { error: 'Tipo de exportación no válido', code: 'INVALID_TYPE' },
        { status: 400 }
      )
    }

    return await exportPlanProyectoExcel(parseInt(id, 10))
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Excel plan_proyecto export error:', error)
    return NextResponse.json(
      { error: 'Error al generar Excel', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

async function exportPlanProyectoExcel(proyectoId: number): Promise<NextResponse> {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: {
      jefeProyecto: { select: { nombre: true } },
      tareas: {
        where: { activo: true },
        orderBy: { id: 'asc' },
        include: {
          tareaPadre: { select: { nombre: true } },
          responsable: { select: { nombre: true } },
          dependenciasOrigen: {
            include: { tareaDestino: { select: { nombre: true } } },
          },
          dependenciasDestino: {
            include: { tareaOrigen: { select: { nombre: true } } },
          },
        },
      },
    },
  })

  if (!proyecto || !proyecto.activo) {
    return NextResponse.json(
      { error: 'Proyecto no encontrado', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const workbook = new ExcelJS.Workbook()

  // ── Sheet 1: Tareas ──
  const wsTareas = workbook.addWorksheet('Tareas')

  // Styled header row
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  }

  const tareaHeaders = [
    'ID', 'Nombre', 'Tarea Padre', 'Responsable', 'Fecha Inicio', 'Fecha Fin',
    '% Avance', 'Presupuesto Est.', 'Costo Ejec.',
  ]
  const tareaHeaderRow = wsTareas.addRow(tareaHeaders)
  tareaHeaderRow.eachCell((cell) => {
    cell.style = headerStyle
  })

  // Data rows
  proyecto.tareas.forEach((t) => {
    wsTareas.addRow([
      t.id,
      t.nombre,
      t.tareaPadre?.nombre ?? '—',
      t.responsable?.nombre ?? '—',
      t.fechaInicio ? t.fechaInicio.toISOString().slice(0, 10) : '—',
      t.fechaFin ? t.fechaFin.toISOString().slice(0, 10) : '—',
      t.progreso,
      Number(t.presupuestoEstimado),
      Number(t.costoEjecutado),
    ])
  })

  // Auto-width columns
  wsTareas.columns = tareaHeaders.map((h) => ({
    header: h,
    key: h.toLowerCase().replace(/\s+/g, '_'),
    width: Math.max(h.length + 5, 14),
  }))

  // Add auto-filter
  wsTareas.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: tareaHeaderRow.number, column: tareaHeaders.length },
  }

  // ── Sheet 2: Dependencias ──
  const wsDeps = workbook.addWorksheet('Dependencias')

  const depHeaders = ['ID', 'Tarea Origen', 'Tarea Destino', 'Tipo']
  const depHeaderRow = wsDeps.addRow(depHeaders)
  depHeaderRow.eachCell((cell) => {
    cell.style = headerStyle
  })

  for (const t of proyecto.tareas) {
    for (const dep of t.dependenciasOrigen) {
      wsDeps.addRow([dep.id, t.nombre, dep.tareaDestino.nombre, dep.tipo])
    }
  }

  wsDeps.columns = depHeaders.map((h) => ({
    header: h,
    key: h.toLowerCase().replace(/\s+/g, '_'),
    width: Math.max(h.length + 5, 18),
  }))

  wsDeps.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: depHeaderRow.number, column: depHeaders.length },
  }

  // ── Sheet 3: Presupuesto ──
  const wsPresupuesto = workbook.addWorksheet('Presupuesto')

  const presupuestoHeaders = ['Concepto', 'Valor']
  const presupuestoHeaderRow = wsPresupuesto.addRow(presupuestoHeaders)
  presupuestoHeaderRow.eachCell((cell) => {
    cell.style = headerStyle
  })

  const presupuesto = Number(proyecto.presupuestoTotal)
  const costoReal = Number(proyecto.costoRealTotal)
  wsPresupuesto.addRow(['Proyecto', proyecto.nombre])
  wsPresupuesto.addRow(['Código', proyecto.codigo])
  wsPresupuesto.addRow(['Estado', proyecto.estado])
  wsPresupuesto.addRow(['Jefe de Proyecto', proyecto.jefeProyecto.nombre])
  wsPresupuesto.addRow(['Presupuesto Total', presupuesto])
  wsPresupuesto.addRow(['Costo Real', costoReal])
  wsPresupuesto.addRow(['Diferencia', presupuesto - costoReal])

  wsPresupuesto.columns = presupuestoHeaders.map((h) => ({
    header: h,
    key: h.toLowerCase(),
    width: 30,
  }))

  // ── Generate buffer ──
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plan_proyecto_${proyectoId}_${dateStr}.xlsx"`,
    },
  })
}
