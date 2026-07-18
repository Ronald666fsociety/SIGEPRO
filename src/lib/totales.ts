import { prisma } from '@/lib/prisma'

/**
 * Recalculate proyecto.presupuestoTotal and proyecto.costoRealTotal
 * by summing all tareas' presupuestoEstimado and costoEjecutado in the project.
 *
 * presupuestoTotal = SUM of all Tarea.presupuestoEstimado in the project
 * costoRealTotal   = SUM of all Tarea.costoEjecutado in the project
 *
 * Called after any CUD on Tarea within a project.
 */
export async function recalcularTotales(proyectoId: number): Promise<void> {
  const result = await prisma.$queryRaw<
    Array<{ total_presupuesto: string | null; total_costo: string | null }>
  >`
    SELECT
      COALESCE(SUM(t.presupuesto_estimado), 0)::text AS total_presupuesto,
      COALESCE(SUM(t.costo_ejecutado), 0)::text AS total_costo
    FROM tareas t
    WHERE t.proyecto_id = ${proyectoId}
      AND t.activo = true
  `

  const totalPresupuesto = parseFloat(result[0]?.total_presupuesto ?? '0')
  const totalCosto = parseFloat(result[0]?.total_costo ?? '0')

  await prisma.proyecto.update({
    where: { id: proyectoId },
    data: {
      presupuestoTotal: totalPresupuesto,
      costoRealTotal: Math.round(totalCosto * 100) / 100,
    },
  })
}
