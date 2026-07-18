import { prisma } from '@/lib/prisma'

/**
 * Detect if adding a dependency from origenId to destinoId would create a cycle.
 *
 * Uses a recursive CTE to traverse forward from destinoId through existing
 * dependencies. If we reach origenId, a cycle exists.
 *
 * @returns true if a cycle would be created
 */
export async function detectaCiclo(
  origenId: number,
  destinoId: number
): Promise<boolean> {
  if (origenId === destinoId) return true

  const result = await prisma.$queryRaw<Array<{ ciclo: boolean }>>`
    WITH RECURSIVE ciclo_cte AS (
      -- Base: start at destinoId
      SELECT dt.tarea_destino_id AS next_id
      FROM dependencias_tarea dt
      WHERE dt.tarea_origen_id = ${destinoId}

      UNION ALL

      -- Recursive: follow dependencies forward
      SELECT dt.tarea_destino_id
      FROM dependencias_tarea dt
      INNER JOIN ciclo_cte c ON dt.tarea_origen_id = c.next_id
    )
    SELECT EXISTS(
      SELECT 1 FROM ciclo_cte WHERE next_id = ${origenId}
    ) AS ciclo
  `

  return result[0]?.ciclo ?? false
}
