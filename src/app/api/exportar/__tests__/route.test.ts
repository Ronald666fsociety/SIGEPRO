import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    proyecto: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    usuario: {
      findMany: vi.fn(),
    },
    auditoria: {
      findMany: vi.fn(),
    },
  },
}))

// ── PDFKit mock: emit data/end events on next tick so generatePdf resolves ──
type EventMap = Record<string, (arg?: any) => void>
const pdfEvents: EventMap = {}

const mockPdfDoc = {
  on: vi.fn((event: string, cb: (arg?: any) => void) => {
    pdfEvents[event] = cb
    return mockPdfDoc
  }),
  pipe: vi.fn().mockReturnThis(),
  end: vi.fn(),
  font: vi.fn().mockReturnThis(),
  fontSize: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  moveDown: vi.fn().mockReturnThis(),
  rect: vi.fn().mockReturnThis(),
  fill: vi.fn().mockReturnThis(),
  fillColor: vi.fn().mockReturnThis(),
  strokeColor: vi.fn().mockReturnThis(),
  lineWidth: vi.fn().mockReturnThis(),
  stroke: vi.fn().mockReturnThis(),
  moveTo: vi.fn().mockReturnThis(),
  lineTo: vi.fn().mockReturnThis(),
  addPage: vi.fn().mockReturnThis(),
  y: 100,
  x: 50,
  page: { width: 612, height: 792, margins: { top: 50, bottom: 50, left: 50, right: 50 } },
}

vi.mock('pdfkit', () => {
  function MockPDFDocument() {
    // Trigger data event on next tick after listeners are registered
    setTimeout(() => {
      try {
        if (typeof pdfEvents['data'] === 'function') {
          pdfEvents['data'](Buffer.from('mock-pdf-content'))
        }
        if (typeof pdfEvents['end'] === 'function') {
          setTimeout(() => pdfEvents['end'](), 1)
        }
      } catch {
        // Ignore if test already ended and events were cleared
      }
    }, 1)
    return mockPdfDoc
  }
  return { default: MockPDFDocument }
})

// ── ExcelJS mock: Workbook must be a callable constructor ──
vi.mock('exceljs', () => {
  const mockCell = {}
  const mockRow = {
    eachCell: vi.fn((cb: (cell: any) => void) => cb(mockCell)),
    number: 1,
  }
  const mockWorksheet = {
    addRow: vi.fn(() => mockRow),
    autoFilter: null as any,
    columns: [] as any[],
  }
  const mockWorkbook = {
    addWorksheet: vi.fn(() => mockWorksheet),
    xlsx: {
      writeBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-excel-buffer')),
    },
  }

  function Workbook() {
    return mockWorkbook
  }

  return { default: { Workbook } }
})

import { GET as pdfGet } from '@/app/api/exportar/pdf/[tipo]/route'
import { GET as excelGet } from '@/app/api/exportar/excel/[tipo]/[id]/route'

function createRequest(url: string, role = 'ADMINISTRADOR'): NextRequest {
  return new Request(url, {
    method: 'GET',
    headers: {
      'x-user-id': '1',
      'x-user-role': role,
      'x-user-nombre': 'Admin',
      'x-user-email': 'admin@test.com',
    },
  }) as unknown as NextRequest
}

describe('PDF export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear cached events between tests
    Object.keys(pdfEvents).forEach((k) => delete pdfEvents[k])
  })

  it('returns application/pdf for proyectos export', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.proyecto.findMany).mockResolvedValue([
      { id: 1, codigo: 'ERP', nombre: 'ERP', presupuestoTotal: { toNumber: () => 100000 }, costoRealTotal: { toNumber: () => 50000 }, estado: 'EN_CURSO', jefeProyecto: { nombre: 'Carlos' } },
    ] as any)

    const req = createRequest('http://localhost/api/exportar/pdf/proyectos')
    const params = Promise.resolve({ tipo: 'proyectos' })
    const res = await pdfGet(req, { params })

    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="reporte_proyectos_')
  })

  it('returns application/pdf for usuarios export', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([
      { nombre: 'Admin', email: 'admin@test.com', rol: 'ADMINISTRADOR' },
    ] as any)

    const req = createRequest('http://localhost/api/exportar/pdf/usuarios')
    const params = Promise.resolve({ tipo: 'usuarios' })
    const res = await pdfGet(req, { params })

    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('returns application/pdf for auditoria export', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.auditoria.findMany).mockResolvedValue([
      { entidad: 'Proyecto', entidadId: 1, accion: 'CREAR', detalle: null, fecha: new Date(), usuarioId: 1, usuario: { nombre: 'Admin' } },
    ] as any)

    const req = createRequest('http://localhost/api/exportar/pdf/auditoria')
    const params = Promise.resolve({ tipo: 'auditoria' })
    const res = await pdfGet(req, { params })

    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('returns 400 for invalid tipo', async () => {
    const req = createRequest('http://localhost/api/exportar/pdf/invalid')
    const params = Promise.resolve({ tipo: 'invalid' })
    const res = await pdfGet(req, { params })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.code).toBe('INVALID_TYPE')
  })
})

describe('Excel export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns xlsx content-type for plan_proyecto export', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.proyecto.findUnique).mockResolvedValue({
      id: 1,
      codigo: 'ERP',
      nombre: 'ERP',
      presupuestoTotal: { toNumber: () => 100000 },
      costoRealTotal: { toNumber: () => 50000 },
      estado: 'EN_CURSO',
      fechaInicio: new Date('2024-01-15'),
      fechaFin: new Date('2024-12-20'),
      activo: true,
      jefeProyecto: { nombre: 'Carlos' },
      tareas: [],
    } as any)

    const req = createRequest('http://localhost/api/exportar/excel/plan_proyecto/1')
    const params = Promise.resolve({ tipo: 'plan_proyecto', id: '1' })
    const res = await excelGet(req, { params })

    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="plan_proyecto_1_')
  })

  it('returns 404 for non-existent project', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.proyecto.findUnique).mockResolvedValue(null)

    const req = createRequest('http://localhost/api/exportar/excel/plan_proyecto/999')
    const params = Promise.resolve({ tipo: 'plan_proyecto', id: '999' })
    const res = await excelGet(req, { params })

    expect(res.status).toBe(404)
  })
})
