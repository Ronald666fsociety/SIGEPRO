import { prisma } from '@/lib/prisma'

/**
 * Log an auditable action to the Auditoria table.
 *
 * @param entidad - The entity type name (e.g. "Proyecto", "Tarea")
 * @param entidadId - The entity's database ID
 * @param accion - The action performed (e.g. "CREAR", "ACTUALIZAR", "ELIMINAR")
 * @param usuarioId - The ID of the user who performed the action
 * @param detalle - Optional free-text detail about what changed
 */
export async function logAudit(
  entidad: string,
  entidadId: number,
  accion: string,
  usuarioId: number,
  detalle?: string
): Promise<void> {
  await prisma.auditoria.create({
    data: {
      entidad,
      entidadId,
      accion,
      detalle: detalle ?? null,
      usuarioId,
    },
  })
}
