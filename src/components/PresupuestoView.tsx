'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Row, Col, Card, Statistic, Table, Typography } from 'antd'
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons'
import type { Proyecto, Tarea } from '@/types'

const { Text } = Typography

// ── Register Chart.js components synchronously ──

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// ── Dynamic import for chart.js Bar ──

const Bar = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Bar),
  { ssr: false }
)

const CHART_COLORS = ['#1677ff', '#ff4d4f', '#52c41a']

interface PresupuestoViewProps {
  proyecto: Proyecto
  tareas: Tarea[]
}

export default function PresupuestoView({ proyecto, tareas }: PresupuestoViewProps) {
  const formatCurrency = (value: number) => {
    return 'Bs ' + value.toLocaleString('es-BO', { minimumFractionDigits: 2 })
  }

  const presupuestoTotal = proyecto.presupuestoTotal
  const costoReal = proyecto.costoRealTotal
  const diferencia = presupuestoTotal - costoReal
  const isPositive = diferencia >= 0

  // ── Bar chart: presupuesto vs costo per root tarea (using per-task data) ──
  const rootTareas = tareas.filter((t) => !t.tareaPadreId)
  const hasChartData = rootTareas.length > 0

  const barData = hasChartData
    ? {
        labels: rootTareas.map((t) => t.nombre),
        datasets: [
          {
            label: 'Presupuesto Estimado',
            data: rootTareas.map((t) => Number(t.presupuestoEstimado ?? 0)),
            backgroundColor: CHART_COLORS[0],
            borderRadius: 4,
          },
          {
            label: 'Costo Ejecutado',
            data: rootTareas.map((t) => Number(t.costoEjecutado ?? 0)),
            backgroundColor: CHART_COLORS[1],
            borderRadius: 4,
          },
        ],
      }
    : null

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const },
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

  // ── Summary table: per-task budget data ──
  const tableData = tareas.map((t) => {
    const tareaPresupuesto = Number(t.presupuestoEstimado ?? 0)
    const tareaCosto = Number(t.costoEjecutado ?? 0)
    const tareaDiff = tareaPresupuesto - tareaCosto
    return {
      key: t.id,
      nombre: t.nombre,
      presupuesto: tareaPresupuesto,
      costo: tareaCosto,
      diferencia: tareaDiff,
    }
  })

  const summaryColumns = [
    {
      title: 'Tarea',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Presupuesto',
      dataIndex: 'presupuesto',
      key: 'presupuesto',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Diferencia',
      dataIndex: 'diferencia',
      key: 'diferencia',
      align: 'right' as const,
      render: (val: number) => (
        <Text strong style={{ color: val >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {formatCurrency(val)}
        </Text>
      ),
    },
  ]

  return (
    <>
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Presupuesto Total"
              value={presupuestoTotal}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Costo Real"
              value={costoReal}
              precision={2}
              prefix={<FallOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Diferencia"
              value={Math.abs(diferencia)}
              precision={2}
              prefix={isPositive ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}
              suffix={isPositive ? 'superávit' : 'déficit'}
            />
          </Card>
        </Col>
      </Row>

      {barData && (
        <Card title="Presupuesto vs Costo por Tarea" style={{ marginBottom: 24 }}>
          <div style={{ maxHeight: 350 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </Card>
      )}

      <Card title="Resumen por Tarea">
        <Table
          dataSource={tableData}
          columns={summaryColumns}
          pagination={false}
          size="small"
          bordered
          locale={{ emptyText: 'No hay tareas para mostrar' }}
        />
      </Card>
    </>
  )
}
