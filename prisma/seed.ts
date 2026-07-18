import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashSync } from 'bcryptjs'
import type {
  EstadoProyecto,
  RolUsuario,
  TipoDependencia,
} from '@prisma/client'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('>>> Iniciando seed de datos enriquecidos...')

  // ── 1. Clean existing data in dependency order ──
  await prisma.auditoria.deleteMany()
  await prisma.asignacion.deleteMany()
  await prisma.dependenciaTarea.deleteMany()
  await prisma.tarea.deleteMany()
  await prisma.proyecto.deleteMany()
  await prisma.usuario.deleteMany()

  console.log('>>> Datos anteriores eliminados.')

  // ── 2. Seed Usuarios ──
  const passwordHash = hashSync('123456', 10)

  const admin = await prisma.usuario.create({
    data: {
      nombre: 'Admin Principal',
      email: 'admin@transandina.com',
      password: passwordHash,
      rol: 'ADMINISTRADOR' as RolUsuario,
      activo: true,
    },
  })

  const jefe = await prisma.usuario.create({
    data: {
      nombre: 'Carlos Mendoza',
      email: 'cmendoza@transandina.com',
      password: passwordHash,
      rol: 'JEFE_PROYECTO' as RolUsuario,
      activo: true,
    },
  })

  const ana = await prisma.usuario.create({
    data: {
      nombre: 'Ana Lopez',
      email: 'alopez@transandina.com',
      password: passwordHash,
      rol: 'USUARIO' as RolUsuario,
      activo: true,
    },
  })

  const pedro = await prisma.usuario.create({
    data: {
      nombre: 'Pedro Garcia',
      email: 'pgarcia@transandina.com',
      password: passwordHash,
      rol: 'USUARIO' as RolUsuario,
      activo: true,
    },
  })

  const maria = await prisma.usuario.create({
    data: {
      nombre: 'Maria Torres',
      email: 'mtorres@transandina.com',
      password: passwordHash,
      rol: 'USUARIO' as RolUsuario,
      activo: true,
    },
  })

  console.log('>>> Usuarios creados correctamente.')

  // ── 3. Seed Proyectos ──
  const app = await prisma.proyecto.create({
    data: {
      codigo: 'APP-2026',
      nombre: 'App Clientes',
      descripcion: 'Desarrollo de aplicacion movil para clientes con portal de compras y pagos',
      presupuestoTotal: 85000,
      costoRealTotal: 35000,
      estado: 'EN_CURSO' as EstadoProyecto,
      fechaInicio: new Date('2026-07-01'),
      fechaFin: new Date('2026-08-30'),
      jefeProyectoId: jefe.id,
      activo: true,
    },
  })

  const erp = await prisma.proyecto.create({
    data: {
      codigo: 'ERP-2026',
      nombre: 'Implementacion ERP',
      descripcion: 'Implementacion del sistema ERP corporativo para contabilidad y RRHH',
      presupuestoTotal: 150000,
      costoRealTotal: 48000,
      estado: 'EN_CURSO' as EstadoProyecto,
      fechaInicio: new Date('2026-06-15'),
      fechaFin: new Date('2026-09-30'),
      jefeProyectoId: jefe.id,
      activo: true,
    },
  })

  const cloud = await prisma.proyecto.create({
    data: {
      codigo: 'CLOUD-2026',
      nombre: 'Migracion Cloud',
      descripcion: 'Migracion de infraestructura y servidores on-premise a AWS',
      presupuestoTotal: 200000,
      costoRealTotal: 15000,
      estado: 'PLANIFICADO' as EstadoProyecto,
      fechaInicio: new Date('2026-07-10'),
      fechaFin: new Date('2026-10-15'),
      jefeProyectoId: jefe.id,
      activo: true,
    },
  })

  console.log('>>> Proyectos creados correctamente.')

  // ── 4. Seed Tareas ──
  async function crearTarea(
    proyecto: { id: number },
    tareaPadreId: number | null,
    nombre: string,
    inicio: Date,
    fin: Date,
    avance: number,
    presupuesto: number,
    costo: number,
    responsableId: number | null,
  ) {
    return prisma.tarea.create({
      data: {
        nombre,
        fechaInicio: inicio,
        fechaFin: fin,
        progreso: avance,
        presupuestoEstimado: presupuesto,
        costoEjecutado: costo,
        proyectoId: proyecto.id,
        tareaPadreId,
        responsableId,
      },
    })
  }

  // ── APP CLIENTES TAREAS (Realizadas, En Curso, Pendientes) ──
  const t1 = await crearTarea(app, null, 'Diseno UX/UI y Wireframes',
    new Date('2026-07-01'), new Date('2026-07-08'), 100, 10000, 9500, pedro.id)

  const t2 = await crearTarea(app, null, 'Desarrollo Backend API REST',
    new Date('2026-07-06'), new Date('2026-07-22'), 100, 25000, 22000, ana.id)

  const t2_1 = await crearTarea(app, t2.id, 'Modulo Autenticacion JWT & OAuth',
    new Date('2026-07-06'), new Date('2026-07-12'), 100, 8000, 7500, ana.id)

  const t2_2 = await crearTarea(app, t2.id, 'Endpoints de Pagos y Pasarela',
    new Date('2026-07-13'), new Date('2026-07-22'), 100, 17000, 14500, pedro.id)

  const t3 = await crearTarea(app, null, 'Desarrollo Frontend React Native',
    new Date('2026-07-10'), new Date('2026-08-05'), 65, 35000, 18000, pedro.id)

  const t3_1 = await crearTarea(app, t3.id, 'Pantalla de Catalogo y Productos',
    new Date('2026-07-10'), new Date('2026-07-18'), 100, 10000, 9000, pedro.id)

  const t3_2 = await crearTarea(app, t3.id, 'Integracion de Notificaciones Push',
    new Date('2026-07-19'), new Date('2026-07-28'), 40, 8000, 3000, maria.id)

  const t4 = await crearTarea(app, null, 'Pruebas QA y Cobertura de Codigo',
    new Date('2026-07-25'), new Date('2026-08-15'), 20, 15000, 2000, maria.id)

  const t5 = await crearTarea(app, null, 'Despliegue App Store & Google Play',
    new Date('2026-08-16'), new Date('2026-08-30'), 0, 10000, 0, ana.id)


  // ── ERP TAREAS ──
  const erp1 = await crearTarea(erp, null, 'Analisis de Procesos Corporativos',
    new Date('2026-06-15'), new Date('2026-07-05'), 100, 15000, 14000, ana.id)

  const erp2 = await crearTarea(erp, null, 'Modulo de Contabilidad General',
    new Date('2026-07-01'), new Date('2026-07-25'), 85, 30000, 25000, pedro.id)

  const erp3 = await crearTarea(erp, null, 'Modulo de Recursos Humanos y Nomina',
    new Date('2026-07-15'), new Date('2026-08-20'), 30, 45000, 12000, maria.id)

  const erp4 = await crearTarea(erp, null, 'Migracion de Base de Datos Historica',
    new Date('2026-08-01'), new Date('2026-09-10'), 0, 40000, 0, ana.id)


  // ── CLOUD TAREAS ──
  const c1 = await crearTarea(cloud, null, 'Auditoria de Infraestructura Actual',
    new Date('2026-07-10'), new Date('2026-07-20'), 100, 15000, 15000, pedro.id)

  const c2 = await crearTarea(cloud, null, 'Configuracion VPC y Subredes AWS',
    new Date('2026-07-18'), new Date('2026-08-10'), 40, 35000, 10000, ana.id)

  const c3 = await crearTarea(cloud, null, 'Migracion de Servidores Web y BD',
    new Date('2026-08-11'), new Date('2026-09-30'), 0, 110000, 0, maria.id)

  console.log('>>> Tareas de prueba creadas exitosamente.')

  // ── 5. Seed Dependencias ──
  async function crearDependencia(origenId: number, destinoId: number, tipo: TipoDependencia) {
    return prisma.dependenciaTarea.create({
      data: { tareaOrigenId: origenId, tareaDestinoId: destinoId, tipo },
    })
  }

  await crearDependencia(t1.id, t2.id, 'FIN_INICIO')
  await crearDependencia(t1.id, t3.id, 'FIN_INICIO')
  await crearDependencia(t2.id, t4.id, 'FIN_INICIO')
  await crearDependencia(t3.id, t4.id, 'FIN_INICIO')
  await crearDependencia(t4.id, t5.id, 'FIN_INICIO')

  await crearDependencia(erp1.id, erp2.id, 'FIN_INICIO')
  await crearDependencia(erp2.id, erp3.id, 'FIN_INICIO')
  await crearDependencia(c1.id, c2.id, 'FIN_INICIO')
  await crearDependencia(c2.id, c3.id, 'FIN_INICIO')

  console.log('>>> Dependencias creadas.')

  // ── 6. Seed Asignaciones ──
  async function crearAsignacion(tareaId: number, usuarioId: number, hrsEst: number, hrsReales: number) {
    return prisma.asignacion.create({
      data: { tareaId, usuarioId, horasEstimadas: hrsEst, horasReales: hrsReales },
    })
  }

  await crearAsignacion(t1.id, pedro.id, 40, 38)
  await crearAsignacion(t2.id, ana.id, 80, 75)
  await crearAsignacion(t3.id, pedro.id, 120, 80)
  await crearAsignacion(t4.id, maria.id, 60, 15)

  console.log('>>> Asignaciones creadas.')

  // ── 7. Seed Auditoría ──
  const auditEntries = [
    { entidad: 'Proyecto', entidadId: app.id, accion: 'CREAR', usuarioId: admin.id, detalle: 'Creación de proyecto App Clientes', fecha: new Date('2026-07-01T09:00:00') },
    { entidad: 'Tarea', entidadId: t1.id, accion: 'ACTUALIZAR', usuarioId: pedro.id, detalle: 'Tarea completada al 100%', fecha: new Date('2026-07-08T17:00:00') },
    { entidad: 'Tarea', entidadId: t2.id, accion: 'ACTUALIZAR', usuarioId: ana.id, detalle: 'Backend completado al 100%', fecha: new Date('2026-07-22T16:30:00') },
  ]

  for (const entry of auditEntries) {
    await prisma.auditoria.create({ data: entry })
  }

  console.log('>>> Datos de prueba cargados correctamente!')
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
