'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Card, Row, Col, Empty, Statistic, Table, Tag, Button, Typography } from 'antd'
import {
  ProjectOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { DashboardResponse } from '@/types'

const { Title } = Typography

// ── Register Chart.js components synchronously (before rendering) ──

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle
)

// ── Dynamic imports (ssr: false for chart.js) ──

const Doughnut = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Doughnut),
  { ssr: false }
)

const Bar = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Bar),
  { ssr: false }
)

// ── Color palette matching original system ──

const ESTADO_COLORS: Record<string, string> = {
  PLANIFICADO: '#1677ff',
  EN_CURSO: '#52c41a',
  FINALIZADO: '#8c8c8c',
  CANCELADO: '#ff4d4f',
}

const ESTADO_LABELS: Record<string, string> = {
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En Curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const CHART_COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2']

interface DashboardChartsProps {
  data: DashboardResponse
}

export default function DashboardCharts({ data }: DashboardChartsProps) {
  const router = useRouter()
  const hasEstados = data.estados && data.estados.length > 0
  const hasPresupuestos = data.presupuestos && data.presupuestos.length > 0
  const stats = data.stats ?? { total: 0, planificados: 0, enCurso: 0, finalizados: 0 }
  const recientes = data.recientes ?? []

  // ── Doughnut chart data ──
  const doughnutData = hasEstados
    ? {
        labels: data.estados.map((e) => ESTADO_LABELS[e.estado] ?? e.estado),
        datasets: [
          {
            data: data.estados.map((e) => e.count),
            backgroundColor: data.estados.map(
              (e) => ESTADO_COLORS[e.estado] ?? '#ccc'
            ),
            borderWidth: 1,
            borderColor: '#fff',
          },
        ],
      }
    : null

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  }

  // ── Bar chart data ──
  const barData = hasPresupuestos
    ? {
        labels: data.presupuestos.map((p) => p.nombre),
        datasets: [
          {
            label: 'Presupuesto',
            data: data.presupuestos.map((p) => p.presupuesto),
            backgroundColor: CHART_COLORS[0],
            borderRadius: 4,
          },
          {
            label: 'Costo Real',
            data: data.presupuestos.map((p) => p.costoReal),
            backgroundColor: CHART_COLORS[1],
            borderRadius: 4,
          },
        ],
      }
    : null

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (tickValue: string | number) =>
            'Bs ' + Number(tickValue).toLocaleString('es-BO'),
        },
      },
    },
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('es-AR')
  }

  const recentColumns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) => (
        <Tag color={ESTADO_COLORS[estado] ?? 'default'}>
          {ESTADO_LABELS[estado] ?? estado}
        </Tag>
      ),
    },
    {
      title: 'Fecha Inicio',
      dataIndex: 'fechaInicio',
      key: 'fechaInicio',
      render: (val: string | null) => formatDate(val),
    },
    {
      title: 'Fecha Fin',
      dataIndex: 'fechaFin',
      key: 'fechaFin',
      render: (val: string | null) => formatDate(val),
    },
    {
      title: '',
      key: 'accion',
      render: (_: unknown, record: { id: number }) => (
        <Button
          type="link"
          icon={<ArrowRightOutlined />}
          onClick={() => router.push(`/proyectos/${record.id}`)}
        >
          Abrir
        </Button>
      ),
    },
  ]

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card
            style={{
              borderLeft: '4px solid #1677ff',
              transition: 'box-shadow 0.3s ease, transform 0.2s ease',
            }}
            hoverable
          >
            <Statistic
              title="Total Proyectos"
              value={stats.total}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{
              borderLeft: '4px solid #1677ff',
              transition: 'box-shadow 0.3s ease, transform 0.2s ease',
            }}
            hoverable
          >
            <Statistic
              title="Planificados"
              value={stats.planificados}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{
              borderLeft: '4px solid #52c41a',
              transition: 'box-shadow 0.3s ease, transform 0.2s ease',
            }}
            hoverable
          >
            <Statistic
              title="En Curso"
              value={stats.enCurso}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{
              borderLeft: '4px solid #8c8c8c',
              transition: 'box-shadow 0.3s ease, transform 0.2s ease',
            }}
            hoverable
          >
            <Statistic
              title="Finalizados"
              value={stats.finalizados}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Distribución de Proyectos">
            {doughnutData ? (
              <div style={{ maxHeight: 350, display: 'flex', justifyContent: 'center' }}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            ) : (
              <Empty description="No hay proyectos" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Presupuesto vs Costo Real">
            {barData ? (
              <div style={{ maxHeight: 350 }}>
                <Bar data={barData} options={barOptions} />
              </div>
            ) : (
              <Empty description="No hay proyectos" />
            )}
          </Card>
        </Col>
      </Row>

      {recientes.length > 0 && (
        <Card title="Proyectos Recientes" style={{ marginTop: 24 }}>
          <Table
            dataSource={recientes}
            columns={recentColumns}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
          />
        </Card>
      )}
    </>
  )
}
