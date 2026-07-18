import type { $Enums } from '@prisma/client'

// ── Re-export Prisma enums ──

export type EstadoProyecto = $Enums.EstadoProyecto
export type RolUsuario = $Enums.RolUsuario
export type TipoDependencia = $Enums.TipoDependencia

// ── Entity types (mirror Prisma models) ──

export interface Usuario {
  id: number
  nombre: string
  email: string
  password: string
  rol: RolUsuario
  activo: boolean
}

export interface Proyecto {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  presupuestoTotal: number
  costoRealTotal: number
  estado: EstadoProyecto
  fechaInicio: string | null
  fechaFin: string | null
  activo: boolean
  jefeProyectoId: number
  nombreJefeProyecto?: string
}

export interface Tarea {
  id: number
  nombre: string
  descripcion: string | null
  fechaInicio: string | null
  fechaFin: string | null
  progreso: number
  presupuestoEstimado: number
  costoEjecutado: number
  activo: boolean
  proyectoId: number
  tareaPadreId: number | null
  responsableId: number | null
  responsableNombre?: string | null
  hijos?: Tarea[]
}

export interface DependenciaTarea {
  id: number
  tipo: TipoDependencia
  tareaOrigenId: number
  tareaDestinoId: number
  nombreTareaOrigen?: string
  nombreTareaDestino?: string
}

export interface Asignacion {
  id: number
  horasEstimadas: number
  horasReales: number
  tareaId: number
  usuarioId: number
  nombreTarea?: string
  nombreUsuario?: string
}

export interface Auditoria {
  id: number
  entidad: string
  entidadId: number
  accion: string
  detalle: string | null
  fecha: string
  usuarioId: number
  nombreUsuario?: string
}

// ── JWT ──

export interface JwtPayload {
  id: number
  nombre: string
  email: string
  rol: RolUsuario
  iat?: number
  exp?: number
}

// ── API request / response types ──

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  usuario: {
    id: number
    nombre: string
    email: string
    rol: RolUsuario
  }
}

export interface ApiError {
  error: string
  code: string
}

export interface DashboardResponse {
  estados: Array<{ estado: string; count: number }>
  presupuestos: Array<{
    id: number
    nombre: string
    presupuesto: number
    costoReal: number
  }>
  stats: {
    total: number
    planificados: number
    enCurso: number
    finalizados: number
  }
  recientes: Array<{
    id: number
    nombre: string
    estado: string
    fechaInicio: string | null
    fechaFin: string | null
    jefeProyecto: string
  }>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AuditoriaFilters {
  entidad?: string
  desde?: string
  hasta?: string
  usuarioId?: number
  page?: number
  limit?: number
}
