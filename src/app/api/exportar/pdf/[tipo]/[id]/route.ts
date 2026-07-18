export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromHeaders, requireRole } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import PDFDocument from 'pdfkit'

// GET /api/exportar/pdf/[tipo]/[id] → export PDF for: plan_proyecto/[id]
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

    return await exportPlanProyecto(parseInt(id, 10))
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('PDF plan_proyecto export error:', error)
    return NextResponse.json(
      { error: 'Error al generar PDF', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

async function exportPlanProyecto(proyectoId: number): Promise<NextResponse> {
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
  const chunks: Buffer[] = []
  const doc = new PDFDocument({
    size: [792, 612],
    margin: 50,
    info: {
      Title: `Plan de Proyecto - ${proyecto.nombre}`,
      Author: 'SIGEPRO',
    },
  })

  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks)
      resolve(
        new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="plan_proyecto_${proyectoId}_${dateStr}.pdf"`,
          },
        })
      )
    })
    doc.on('error', reject)

    // ── Header ──
    doc.font('Helvetica-Bold').fontSize(20)
    doc.text(proyecto.nombre, { align: 'center' })
    doc.moveDown(0.3)
    doc.font('Helvetica').fontSize(11)
    doc.text(`Código: ${proyecto.codigo}`, { align: 'center' })
    doc.fontSize(10)
    doc.text(`Jefe de Proyecto: ${proyecto.jefeProyecto.nombre}`, { align: 'center' })
    doc.text(`Estado: ${proyecto.estado}`, { align: 'center' })
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, { align: 'center' })
    doc.moveDown(0.5)

    // ── Budget Summary ──
    const presupuesto = Number(proyecto.presupuestoTotal)
    const costoReal = Number(proyecto.costoRealTotal)
    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').fontSize(14)
    doc.text('Resumen de Presupuesto')
    doc.font('Helvetica').fontSize(10)
    doc.text(`Presupuesto Total: $${presupuesto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`)
    doc.text(`Costo Real: $${costoReal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`)
    doc.text(`Diferencia: $${(presupuesto - costoReal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`)
    doc.moveDown(1)

    // ── Tasks Table ──
    const headers = ['#', 'Tarea', 'Padre', 'Responsable', 'Inicio', 'Fin', '% Avance', 'Presupuesto', 'Costo']
    const colWidths = [20, 120, 80, 70, 60, 60, 40, 60, 60]
    const totalWidth = colWidths.reduce((a, b) => a + b, 0)
    const startX = (doc.page.width - totalWidth) / 2

    doc.font('Helvetica-Bold').fontSize(14)
    doc.text('Tareas del Proyecto')
    doc.moveDown(0.5)

    let currentY = doc.y

    // Helper to draw header
    function drawHeader() {
      doc.fillColor('#2563eb')
      doc.rect(startX, currentY, totalWidth, 22).fill()
      doc.fillColor('#ffffff')
      doc.font('Helvetica-Bold').fontSize(7)
      let xPos = startX
      headers.forEach((h, i) => {
        doc.text(h, xPos + 2, currentY + 6, { width: colWidths[i] - 4, align: 'left' })
        xPos += colWidths[i]
      })
      currentY += 22
      doc.fillColor('#000000')
      doc.font('Helvetica').fontSize(6.5)
    }

    drawHeader()

    // Rows
    proyecto.tareas.forEach((t, idx) => {
      // Check page break
      if (currentY > doc.page.height - 60) {
        doc.addPage()
        currentY = 50
        drawHeader()
      }

      if (idx % 2 === 0) {
        doc.fillColor('#f3f4f6')
        doc.rect(startX, currentY, totalWidth, 18).fill()
        doc.fillColor('#000000')
      }

      const rowData = [
        String(t.id),
        t.nombre,
        t.tareaPadre?.nombre ?? '—',
        t.responsable?.nombre ?? '—',
        t.fechaInicio ? t.fechaInicio.toISOString().slice(0, 10) : '—',
        t.fechaFin ? t.fechaFin.toISOString().slice(0, 10) : '—',
        `${t.progreso}%`,
        `$${Number(t.presupuestoEstimado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
        `$${Number(t.costoEjecutado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      ]

      let xPos = startX
      rowData.forEach((cellText, i) => {
        doc.text(cellText, xPos + 2, currentY + 4, { width: colWidths[i] - 4, align: 'left' })
        xPos += colWidths[i]
      })
      currentY += 18
    })

    doc.end()
  })
}
