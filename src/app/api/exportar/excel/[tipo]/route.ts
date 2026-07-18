export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromHeaders, requireRole } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'

// GET /api/exportar/excel/[tipo] → only plan_proyecto/[id] via [tipo]/[id] route
// This route only exists for consistency — returns 400 since [tipo] alone can't hold plan_proyecto
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

    // Excel export only supports plan_proyecto via the [id] sub-route
    return NextResponse.json(
      {
        error: 'Tipo de exportación no válido. Use /api/exportar/excel/plan_proyecto/{id}',
        code: 'INVALID_TYPE',
      },
      { status: 400 }
    )
  } catch (error: any) {
    if (error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: error.message, code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('Excel export error:', error)
    return NextResponse.json(
      { error: 'Error al generar Excel', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
