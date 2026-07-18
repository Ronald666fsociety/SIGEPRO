import { prisma } from '@/lib/prisma'
import DashboardCharts from '@/components/DashboardCharts'
import type { DashboardResponse } from '@/types'

async function getDashboardData(): Promise<DashboardResponse> {
  // ── Project distribution by estado (for doughnut chart) ──
  const estadosRaw = await prisma.$queryRaw<
    Array<{ estado: string; count: bigint }>
  >`
    SELECT estado::text, COUNT(*)::bigint AS count
    FROM proyectos
    WHERE activo = true
    GROUP BY estado
    ORDER BY estado
  `

  const estados = estadosRaw.map((e) => ({
    estado: e.estado,
    count: Number(e.count),
  }))

  // ── Budget vs actual cost per project (for bar chart) ──
  const proyectos = await prisma.proyecto.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      presupuestoTotal: true,
      costoRealTotal: true,
    },
    orderBy: { id: 'asc' },
  })

  const presupuestos = proyectos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    presupuesto: Number(p.presupuestoTotal),
    costoReal: Number(p.costoRealTotal),
  }))

  // ── Stats counts ──
  const total = proyectos.length
  const planificados = estados.find((e) => e.estado === 'PLANIFICADO')?.count ?? 0
  const enCurso = estados.find((e) => e.estado === 'EN_CURSO')?.count ?? 0
  const finalizados = estados.find((e) => e.estado === 'FINALIZADO')?.count ?? 0

  // ── Recent projects (last 5) ──
  const recentProyectos = await prisma.proyecto.findMany({
    where: { activo: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      jefeProyecto: { select: { nombre: true } },
    },
  })

  const recientes = recentProyectos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    estado: p.estado,
    fechaInicio: p.fechaInicio?.toISOString() ?? null,
    fechaFin: p.fechaFin?.toISOString() ?? null,
    jefeProyecto: p.jefeProyecto.nombre,
  }))

  return { estados, presupuestos, stats: { total, planificados, enCurso, finalizados }, recientes }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return <DashboardCharts data={data} />
}
