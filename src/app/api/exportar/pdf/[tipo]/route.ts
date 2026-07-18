export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromHeaders, requireRole } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import PDFDocument from 'pdfkit'

// GET /api/exportar/pdf/[tipo] → export PDF for: proyectos, usuarios, auditoria
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
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

    const { tipo } = await params
    const dateStr = new Date().toISOString().slice(0, 10)

    switch (tipo) {
      case 'proyectos':
        return await exportProyectos(dateStr)
      case 'usuarios':
        return await exportUsuarios(dateStr)
      case 'auditoria':
        return await exportAuditoria(dateStr)
      default:
        return NextResponse.json(
          { error: 'Tipo de exportación no válido', code: 'INVALID_TYPE' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('PDF export error:', error)
    return NextResponse.json(
      { error: 'Error al generar PDF', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ── Helper: generate PDF buffer ──

async function generatePdf(
  title: string,
  headers: string[],
  rows: string[][]
): Promise<Buffer> {
  const chunks: Buffer[] = []
  const doc = new PDFDocument({
    size: [792, 612],
    margin: 50,
    info: { Title: title, Author: 'SIGEPRO' },
  })

  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ── Title ──
    doc.font('Helvetica-Bold').fontSize(18)
    doc.text(title, { align: 'center' })
    doc.moveDown(0.5)

    // ── Date ──
    doc.font('Helvetica').fontSize(10)
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, { align: 'center' })
    doc.moveDown(1)

    // ── Table header ──
    const colWidth = (doc.page.width - 100) / Math.max(headers.length, 1)
    const tableTop = doc.y
    let currentY = tableTop

    // Header background
    doc.fillColor('#2563eb')
    doc.rect(50, currentY, doc.page.width - 100, 22).fill()
    doc.fillColor('#ffffff')
    doc.font('Helvetica-Bold').fontSize(9)
    headers.forEach((h, i) => {
      doc.text(h, 50 + i * colWidth + 4, currentY + 6, {
        width: colWidth - 8,
        align: 'left',
      })
    })
    currentY += 22

    // ── Table rows ──
    doc.fillColor('#000000')
    doc.font('Helvetica').fontSize(8)

    for (let r = 0; r < rows.length; r++) {
      // Check if we need a new page
      if (currentY > doc.page.height - 60) {
        doc.addPage()
        currentY = 50

        // Repeat header on new page
        doc.fillColor('#2563eb')
        doc.rect(50, currentY, doc.page.width - 100, 22).fill()
        doc.fillColor('#ffffff')
        doc.font('Helvetica-Bold').fontSize(9)
        headers.forEach((h, i) => {
          doc.text(h, 50 + i * colWidth + 4, currentY + 6, {
            width: colWidth - 8,
            align: 'left',
          })
        })
        currentY += 22
        doc.fillColor('#000000')
        doc.font('Helvetica').fontSize(8)
      }

      // Alternating row background
      if (r % 2 === 0) {
        doc.fillColor('#f3f4f6')
        doc.rect(50, currentY, doc.page.width - 100, 18).fill()
        doc.fillColor('#000000')
      }

      rows[r].forEach((cellText, i) => {
        doc.text(cellText ?? '', 50 + i * colWidth + 4, currentY + 4, {
          width: colWidth - 8,
          align: 'left',
        })
      })
      currentY += 18
    }

    doc.end()
  })
}

// ── Export helpers ──

async function exportProyectos(dateStr: string): Promise<NextResponse> {
  const proyectos = await prisma.proyecto.findMany({
    where: { activo: true },
    include: {
      jefeProyecto: { select: { nombre: true } },
    },
    orderBy: { nombre: 'asc' },
  })

  const headers = ['Código', 'Nombre', 'Estado', 'Presupuesto', 'Costo Real', 'Jefe Proyecto']
  const rows = proyectos.map((p) => [
    p.codigo,
    p.nombre,
    p.estado,
    `$${Number(p.presupuestoTotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    `$${Number(p.costoRealTotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    p.jefeProyecto.nombre,
  ])

  const pdf = await generatePdf('Reporte de Proyectos', headers, rows)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte_proyectos_${dateStr}.pdf"`,
    },
  })
}

async function exportUsuarios(dateStr: string): Promise<NextResponse> {
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
  })

  const headers = ['Nombre', 'Email', 'Rol']
  const rows = usuarios.map((u) => [u.nombre, u.email, u.rol])

  const pdf = await generatePdf('Reporte de Usuarios', headers, rows)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte_usuarios_${dateStr}.pdf"`,
    },
  })
}

async function exportAuditoria(dateStr: string): Promise<NextResponse> {
  const logs = await prisma.auditoria.findMany({
    include: {
      usuario: { select: { nombre: true } },
    },
    orderBy: { fecha: 'desc' },
    take: 1000,
  })

  const headers = ['Fecha', 'Usuario', 'Acción', 'Entidad', 'ID Entidad', 'Detalle']
  const rows = logs.map((l) => [
    l.fecha.toISOString().slice(0, 19).replace('T', ' '),
    l.usuario.nombre,
    l.accion,
    l.entidad,
    String(l.entidadId),
    l.detalle ?? '',
  ])

  const pdf = await generatePdf('Reporte de Auditoría', headers, rows)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte_auditoria_${dateStr}.pdf"`,
    },
  })
}
