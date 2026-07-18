# SIGEPRO — Sistema de Gestión de Proyectos

Sistema integral de gestión de proyectos, estructura desglosada de trabajo (WBS), diagrama de Gantt interactivo, control presupuestario, asignación de recursos y auditoría.

---

## 📋 Tabla de Contenidos
1. [Análisis del Sistema](#-análisis-del-sistema)
   - [Objetivo del Sistema](#objetivo-del-sistema)
   - [Arquitectura Tecnológica](#arquitectura-tecnológica)
   - [Modelo de Dominio y Base de Datos](#modelo-de-dominio-y-base-de-datos)
   - [Seguridad y Control de Acceso](#seguridad-y-control-de-acceso)
   - [Principales Funcionalidades](#principales-funcionalidades)
2. [Manual de Usuario](#-manual-de-usuario)
   - [Requisitos del Sistema](#requisitos-del-sistema)
   - [Instalación y Configuración](#instalación-y-configuración)
   - [Puesta en Marcha](#puesta-en-marcha)
   - [Guía de Navegación y Uso](#guía-de-navegación-y-uso)
     - [1. Autenticación e Inicio de Sesión](#1-autenticación-e-inicio-de-sesión)
     - [2. Dashboard General](#2-dashboard-general)
     - [3. Gestión de Proyectos](#3-gestión-de-proyectos)
     - [4. Detalle de Proyecto, Tareas Jerárquicas (WBS) y Gantt](#4-detalle-de-proyecto-tareas-jerárquicas-wbs-y-gantt)
     - [5. Dependencias entre Tareas](#5-dependencias-entre-tareas)
     - [6. Asignación de Recursos](#6-asignación-de-recursos)
     - [7. Módulo de Reportes y Exportación (PDF / Excel)](#7-módulo-de-reportes-y-exportación-pdf--excel)
     - [8. Administración de Usuarios y Roles](#8-administración-de-usuarios-y-roles)
     - [9. Log de Auditoría](#9-log-de-auditoría)
3. [Estructura del Código](#-estructura-del-código)

---

## 📐 Análisis del Sistema

### Objetivo del Sistema
**SIGEPRO** ha sido diseñado para centralizar, planificar, supervisar y auditar la ejecución de proyectos organizacionales. Proporciona visibilidad en tiempo real sobre el avance físico (diagrama de Gantt y árbol WBS), la salud financiera (presupuesto vs. costo real ejecutado), la asignación eficiente de recursos humanos y la trazabilidad total de operaciones mediante registros de auditoría.

### Arquitectura Tecnológica
El sistema adopta una arquitectura moderna basada en **Next.js 16 (App Router)** y **TypeScript**, garantizando renderizado híbrido (SSR/CSR), seguridad de tipos y alto rendimiento.

- **Frontend / UI**: React 19, Ant Design v6, CSS Vanilla / Tailwind, Chart.js (`react-chartjs-2`), Frappe Gantt (`frappe-gantt`).
- **Backend / API**: Next.js API Routes / Route Handlers, TypeScript, JWT (Jose / JsonWebToken), BcryptJS.
- **Persistencia & ORM**: PostgreSQL, Prisma ORM 7.x (con adaptador `@prisma/adapter-pg`).
- **Generación de Documentos**: PDFKit (Reportes en PDF), ExcelJS (Hojas de cálculo en Excel).
- **Testing & Tooling**: Vitest, TypeScript, Ts-node.

```
+-------------------------------------------------------------------+
|                         CLIENTE / BROWSER                         |
|   (Ant Design Components + Chart.js + Frappe Gantt + CSS System)  |
+-------------------------------------------------------------------+
                                  │  HTTP / JSON / JWT
                                  ▼
+-------------------------------------------------------------------+
|                    NEXT.JS 16 APP ROUTER SERVER                   |
|  ┌────────────────────────┐         ┌──────────────────────────┐  |
|  │    Route Handlers      │ ◄─────► │    Middleware & JWT Auth │  |
|  └───────────┬────────────┘         └──────────────────────────┘  |
|              │                                                    |
|              ▼                                                    |
|  ┌────────────────────────┐         ┌──────────────────────────┐  |
|  │     Prisma ORM         │ ◄─────► │   Export (PDFKit/Excel)  │  |
|  └───────────┬────────────┘         └──────────────────────────┘  |
+--------------┼────────────────────────────────────────────────────+
               │ SQL Queries
               ▼
+-------------------------------------------------------------------+
|                        POSTGRESQL DATABASE                        |
+-------------------------------------------------------------------+
```

### Modelo de Dominio y Base de Datos
El modelo relacional en Prisma abarca las siguientes entidades principales:

1. **`Usuario`**: Almacena credenciales encriptadas con Bcrypt, datos personales y rol de acceso (`ADMINISTRADOR`, `JEFE_PROYECTO`, `USUARIO`).
2. **`Proyecto`**: Entidad principal que agrupa código único, nombre, descripción, fechas estimadas, presupuesto total, costo real ejecutado y estado (`PLANIFICADO`, `EN_CURSO`, `FINALIZADO`, `CANCELADO`).
3. **`Tarea`**: Estructura de desglose de trabajo (WBS) autorreferenciada (`tareaPadreId`) para soporte de jerarquías de tareas infinitas. Contiene fechas, porcentaje de progreso, presupuesto estimado y costo ejecutado.
4. **`DependenciaTarea`**: Define restricciones secuenciales entre tareas (`FIN_INICIO`, `INICIO_INICIO`, `FIN_FIN`, `INICIO_FIN`), evitando ciclos mediante validación algorítmica.
5. **`Asignacion`**: Asocia usuarios a tareas registrando las horas estimadas y horas reales invertidas.
6. **`Auditoria`**: Captura cada acción (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`), entidad afectada, usuario responsable y timestamp.

### Seguridad y Control de Acceso
- **Autenticación basante en Token (JWT)**: Las credenciales se verifican contra contraseñas hasheadas (`bcryptjs`). Tras autenticarse correctamente, el servidor firma un JWT almacenado en cookies seguras o headers de autorización.
- **Control de Acceso basado en Roles (RBAC)**:
  - **`ADMINISTRADOR`**: Acceso total al sistema, creación/edición de usuarios, gestión de proyectos, reportes y auditoría.
  - **`JEFE_PROYECTO`**: Gestión completa de proyectos asignados, creación de tareas, asignación de recursos y exportaciones.
  - **`USUARIO`**: Visualización de proyectos, actualización de progreso en tareas asignadas y registro de horas.

---

## 📖 Manual de Usuario

### Requisitos del Sistema
- **Node.js**: v18.0.0 o superior
- **NPM**: v9.0.0 o superior
- **PostgreSQL**: v14.0 o superior (Local o Servidor Remoto)

### Instalación y Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Ronald666fsociety/SIGEPRO.git
   cd SIGEPRO
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar las Variables de Entorno (`.env`)**:
   Cree o configure el archivo `.env` en la raíz del proyecto:
   ```env
   DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/sigepro"
   JWT_SECRET="sigepro_jwt_secret_key_2026_transandina"
   JWT_EXPIRATION="24h"
   ```

4. **Sincronizar la Base de Datos con Prisma**:
   ```bash
   npx prisma db push
   ```

5. **Poblar la Base de Datos con Datos Semilla (Opcional)**:
   ```bash
   npm run seed
   ```

### Puesta en Marcha
Para iniciar el servidor de desarrollo:
```bash
npm run dev
```
Abra su navegador e ingrese a **`http://localhost:3000`**.

---

### Guía de Navegación y Uso

#### 1. Autenticación e Inicio de Sesión
- Ingrese su correo electrónico y contraseña registrados.
- Si utilizó `npm run seed`, las credenciales por defecto son:
  - **Admin**: `admin@sigepro.com` / `admin123`
  - **Jefe de Proyecto**: `jefe@sigepro.com` / `jefe123`
  - **Usuario**: `usuario@sigepro.com` / `user123`

#### 2. Dashboard General
Al ingresar al sistema visualiza:
- **Tarjetas de Resumen**: Proyectos totales, planificados, en curso y finalizados.
- **Gráfico de Distribución de Estado**: Gráfico de rosca con los estados de los proyectos.
- **Gráfico de Presupuesto vs. Costo Real**: Gráfico de barras comparativo de salud financiera por proyecto.
- **Lista de Proyectos Recientes**: Acceso rápido a los últimos proyectos modificados.

#### 3. Gestión de Proyectos
- Acceda al menú **Proyectos** en la barra lateral.
- **Crear Proyecto**: Haga clic en `+ Nuevo Proyecto`. Ingrese Código, Nombre, Descripción, Presupuesto Total, Fechas estimada de Inicio/Fin y asigne un Jefe de Proyecto.
- **Filtros y Búsqueda**: Busque por nombre o filtre por estado (`PLANIFICADO`, `EN_CURSO`, `FINALIZADO`, `CANCELADO`).

#### 4. Detalle de Proyecto, Tareas Jerárquicas (WBS) y Gantt
Haga clic sobre cualquier proyecto para ingresar a su vista detallada. Encontrará tres pestañas principales:
1. **Árbol de Tareas (WBS)**:
   - Permite crear tareas raíz o sub-tareas dependientes de otra tarea padre.
   - Registre el progreso (0% a 100%), presupuesto estimado y costo ejecutado.
   - El costo y avance del proyecto se calcula dinámicamente según sus sub-tareas.
2. **Diagrama de Gantt**:
   - Visualización gráfica temporal de todas las tareas del proyecto.
   - Interactividad para evaluar solapamientos, fechas críticas y dependencias.
3. **Presupuesto**:
   - Resumen ejecutivo de desviación financiera (Presupuesto Estimado vs Costo Real Ejecutado).

#### 5. Dependencias entre Tareas
- En la vista de tareas de un proyecto, configure relaciones entre tareas:
  - **Fin a Inicio (FS)**: La tarea B no puede iniciar hasta que finalice la tarea A.
  - **Inicio a Inicio (SS)**: La tarea B inicia simultáneamente con la tarea A.
  - **Fin a Fin (FF)**: La tarea B finaliza simultáneamente con la tarea A.
  - **Inicio a Fin (SF)**: La tarea B finaliza cuando inicia la tarea A.
- El sistema valida automáticamente para evitar dependencias cíclicas.

#### 6. Asignación de Recursos
- Asigne miembros del equipo a tareas específicas.
- Registre las **Horas Estimadas** y las **Horas Reales** ejecutadas por cada usuario para calcular la eficiencia del recurso.

#### 7. Módulo de Reportes y Exportación (PDF / Excel)
- Acceda a la sección **Reportes**.
- **Reporte en PDF**: Genera un documento con formato profesional para presentación ejecutiva de proyectos, presupuesto y estado de avance.
- **Exportación Excel**: Descarga planillas de cálculo completas con el deslose de tareas, costos y tiempos.

#### 8. Administración de Usuarios y Roles
*(Disponible para perfil Administrador)*
- Gestión de usuarios del sistema (Crear, Editar, Desactivar).
- Asignación de roles (`ADMINISTRADOR`, `JEFE_PROYECTO`, `USUARIO`).

#### 9. Log de Auditoría
- Acceda al menú **Auditoría** para consultar el historial inalterable de acciones del sistema.
- Permite saber exactamente qué usuario creó, modificó o eliminó determinado registro y en qué fecha.

---

## 📁 Estructura del Código

```
sigepro-next/
├── prisma/
│   ├── schema.prisma       # Definición del modelo de base de datos relacional
│   └── seed.ts             # Script de datos iniciales / prueba
├── src/
│   ├── app/                # Next.js App Router (Páginas, Layouts y API Routes)
│   │   ├── (auth)/         # Módulo de Autenticación (Login)
│   │   ├── (dashboard)/    # Vistas protegidas (Dashboard, Proyectos, Reportes, Usuarios, Auditoría)
│   │   └── api/            # Route Handlers de API REST (Proyectos, Tareas, Gantt, Reportes)
│   ├── components/         # Componentes React (GanttChart, TareaTree, DashboardCharts, etc.)
│   ├── context/            # Contexto global de autenticación y sesión
│   ├── lib/                # Funciones auxiliares (Prisma Client, Auth JWT, Audit Logs, Cálculos)
│   ├── services/           # Cliente API para consumo de endpoints en frontend
│   ├── styles/             # Estilos globales CSS e integración con Gantt
│   └── types/              # Definiciones de interfaces y tipos TypeScript
├── package.json
└── README.md
```
