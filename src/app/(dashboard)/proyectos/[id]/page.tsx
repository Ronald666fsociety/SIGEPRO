'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Tabs,
  Tag,
  Typography,
  Spin,
  Alert,
  Button,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import TareaTree from '@/components/TareaTree'
import GanttChart from '@/components/GanttChart'
import DependenciaList from '@/components/DependenciaList'
import RecursoList from '@/components/RecursoList'
import PresupuestoView from '@/components/PresupuestoView'
import { useAuth } from '@/context/AuthContext'
import type { Proyecto, Tarea, DependenciaTarea, Asignacion, Usuario } from '@/types'

const { Title, Text } = Typography

const ESTADO_LABELS: Record<string, string> = {
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En Curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const ESTADO_COLORS: Record<string, string> = {
  PLANIFICADO: 'blue',
  EN_CURSO: 'green',
  FINALIZADO: 'default',
  CANCELADO: 'red',
}

export default function ProyectoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const proyectoId = Number(params.id)
  const { user, hasRole } = useAuth()

  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [dependencias, setDependencias] = useState<DependenciaTarea[]>([])
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('tareas')

  const puedeEditar = hasRole(['ADMINISTRADOR', 'JEFE_PROYECTO'])
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  const fetchAll = useCallback(async () => {
    if (!proyectoId) return
    setLoading(true)
    setError(null)

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      }

      const [proyRes, tareasRes, depsRes, asigRes, usuariosRes] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}`, { headers }),
        fetch(`/api/tareas/proyecto/${proyectoId}`, { headers }),
        fetch(`/api/dependencias/proyecto/${proyectoId}`, { headers }),
        fetch(`/api/asignaciones/proyecto/${proyectoId}`, { headers }),
        fetch('/api/usuarios', { headers }),
      ])

      if (!proyRes.ok) throw new Error('Error al cargar proyecto')
      if (!tareasRes.ok) throw new Error('Error al cargar tareas')
      if (!depsRes.ok) throw new Error('Error al cargar dependencias')
      if (!asigRes.ok) throw new Error('Error al cargar asignaciones')

      setProyecto(await proyRes.json())
      setTareas(await tareasRes.json())
      setDependencias(await depsRes.json())
      setAsignaciones(await asigRes.json())
      if (usuariosRes.ok) {
        setUsuarios(await usuariosRes.json())
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error desconocido'
      )
    } finally {
      setLoading(false)
    }
  }, [proyectoId, token])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleExportPDF = async () => {
    try {
      const res = await fetch(`/api/exportar/pdf/plan_proyecto/${proyectoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) {
        message.info('Exportación disponible próximamente')
        return
      }
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proyecto-${proyectoId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.info('Exportación disponible próximamente')
    }
  }

  const handleExportExcel = async () => {
    try {
      const res = await fetch(`/api/exportar/excel/plan_proyecto/${proyectoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) {
        message.info('Exportación disponible próximamente')
        return
      }
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proyecto-${proyectoId}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.info('Exportación disponible próximamente')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />
  }

  if (!proyecto) {
    return <Alert message="Proyecto no encontrado" type="warning" showIcon />
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('es-AR')
  }

  const tabItems = [
    {
      key: 'tareas',
      label: 'Tareas',
      children: (
        <TareaTree
          tareas={tareas}
          usuarios={usuarios}
          puedeEditar={puedeEditar}
          usuarioActual={{
            id: user?.id ?? 0,
            rol: user?.rol ?? 'USUARIO',
          }}
          onTareaChange={fetchAll}
        />
      ),
    },
    {
      key: 'gantt',
      label: 'Gantt',
      children: <GanttChart proyectoId={proyectoId} />,
    },
    {
      key: 'dependencias',
      label: 'Dependencias',
      children: (
        <DependenciaList
          dependencias={dependencias}
          tareas={tareas}
          puedeEditar={puedeEditar}
          onDependenciaChange={fetchAll}
        />
      ),
    },
    {
      key: 'asignaciones',
      label: 'Asignaciones',
      children: (
        <RecursoList
          asignaciones={asignaciones}
          tareas={tareas}
          usuarios={usuarios}
          puedeEditar={puedeEditar}
          onAsignacionChange={fetchAll}
        />
      ),
    },
    {
      key: 'presupuesto',
      label: 'Presupuesto',
      children: <PresupuestoView proyecto={proyecto} tareas={tareas} />,
    },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Top Breadcrumb ── */}
      <div style={{ marginBottom: 16 }}>
        <a
          onClick={() => router.push('/proyectos')}
          className="page-back-button"
          style={{ cursor: 'pointer' }}
        >
          <ArrowLeftOutlined /> Volver a Proyectos
        </a>
      </div>

      {/* ── Header Card ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
          background: '#ffffff',
          padding: '22px 28px',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Space direction="vertical" size={4}>
          <Space align="center" size={12}>
            <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
              {proyecto.nombre}
            </Title>
            <Tag
              color={ESTADO_COLORS[proyecto.estado] ?? 'default'}
              style={{ fontSize: 13, padding: '4px 14px', borderRadius: 20 }}
            >
              {ESTADO_LABELS[proyecto.estado] ?? proyecto.estado}
            </Tag>
          </Space>
          {proyecto.descripcion && (
            <Text type="secondary" style={{ fontSize: 14, color: '#475569' }}>
              {proyecto.descripcion}
            </Text>
          )}
        </Space>

        <Space size={12}>
          <Button
            icon={<FilePdfOutlined />}
            onClick={handleExportPDF}
            style={{ borderRadius: 10, height: 42 }}
          >
            PDF
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            style={{ borderRadius: 10, height: 42 }}
          >
            Excel
          </Button>
        </Space>
      </div>

      {/* ── Stat Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bodyStyle={{ padding: 18 }}>
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: 13 }}><CodeOutlined style={{ color: '#2563eb' }} /> Código</Text>}
              value={proyecto.codigo}
              valueStyle={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bodyStyle={{ padding: 18 }}>
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: 13 }}><UserOutlined style={{ color: '#2563eb' }} /> Jefe de Proyecto</Text>}
              value={proyecto.nombreJefeProyecto ?? 'Sin asignar'}
              valueStyle={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bodyStyle={{ padding: 18 }}>
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: 13 }}><CalendarOutlined style={{ color: '#2563eb' }} /> Fechas</Text>}
              value={`${formatDate(proyecto.fechaInicio)} — ${formatDate(proyecto.fechaFin)}`}
              valueStyle={{ fontSize: 14, fontWeight: 600, color: '#334155' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bodyStyle={{ padding: 18 }}>
            <Statistic
              title={<Text style={{ color: '#64748b', fontSize: 13 }}><DollarCircleOutlined style={{ color: '#2563eb' }} /> Presupuesto Total</Text>}
              value={proyecto.presupuestoTotal}
              precision={2}
              prefix="Bs "
              valueStyle={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Main Tabs ── */}
      <Card bodyStyle={{ padding: 24 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          tabBarStyle={{ marginBottom: 24 }}
        />
      </Card>
    </div>
  )
}
