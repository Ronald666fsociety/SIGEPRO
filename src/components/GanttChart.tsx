'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Spin, Alert, Typography, Radio, Card, Empty, Space, Tooltip, Progress, Row, Col, Statistic, Tag } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import type { GanttTask } from '@/app/api/gantt/proyecto/[idProyecto]/route'

const { Text, Title } = Typography

interface GanttChartProps {
  proyectoId: number
}

type ViewMode = 'Week' | 'Day' | 'Month'

// Helper to parse "YYYY-MM-DD" into local Date object without UTC shift
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  const parts = dateStr.split('-').map(Number)
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  return new Date(dateStr)
}

export default function GanttChart({ proyectoId }: GanttChartProps) {
  const [tasks, setTasks] = useState<GanttTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('Week')

  // ── Fetch Gantt data ──
  useEffect(() => {
    let mounted = true

    async function fetchGanttData() {
      try {
        setLoading(true)
        setError(null)

        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const res = await fetch(`/api/gantt/proyecto/${proyectoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('No se encontraron datos del proyecto')
          }
          throw new Error('Error al cargar datos del Gantt')
        }

        const data = await res.json()
        if (mounted) {
          setTasks(data.tasks ?? [])
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Error desconocido'
          )
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchGanttData()

    return () => {
      mounted = false
    }
  }, [proyectoId])

  // ── Stats Calculation ──
  const stats = useMemo(() => {
    if (tasks.length === 0) return { total: 0, completadas: 0, enCurso: 0, pendientes: 0, promedio: 0 }

    const total = tasks.length
    let completadas = 0
    let enCurso = 0
    let pendientes = 0
    let sumaAvance = 0

    tasks.forEach((t) => {
      const prog = t.progress ?? 0
      sumaAvance += prog
      if (prog >= 100) completadas++
      else if (prog > 0) enCurso++
      else pendientes++
    })

    const promedio = Math.round(sumaAvance / total)

    return { total, completadas, enCurso, pendientes, promedio }
  }, [tasks])

  // ── Auto-fit Date Scale & Grouping ──
  const timelineData = useMemo(() => {
    if (tasks.length === 0) return null

    let minMs = Infinity
    let maxMs = -Infinity

    tasks.forEach((t) => {
      const startD = parseLocalDate(t.start)
      const endD = parseLocalDate(t.end)
      if (startD.getTime() < minMs) minMs = startD.getTime()
      if (endD.getTime() > maxMs) maxMs = endD.getTime()
    })

    if (minMs === Infinity || maxMs === -Infinity) {
      minMs = new Date().getTime()
      maxMs = minMs + 30 * 24 * 60 * 60 * 1000
    }

    // Set exact project start and end range with 2-day buffer
    const projectStartDate = new Date(minMs)
    projectStartDate.setDate(projectStartDate.getDate() - 2)

    const projectEndDate = new Date(maxMs)
    projectEndDate.setDate(projectEndDate.getDate() + 4)

    const totalDays = Math.max(
      Math.ceil((projectEndDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)),
      14
    )

    // Generate week/interval headers
    const intervals: { label: string; startDay: number; daySpan: number }[] = []
    const intervalDaysSpan = viewMode === 'Day' ? 1 : viewMode === 'Week' ? 7 : 14
    const numIntervals = Math.ceil(totalDays / intervalDaysSpan)

    for (let i = 0; i < numIntervals; i++) {
      const startDayNum = i * intervalDaysSpan
      const weekNum = i + 1
      const label =
        viewMode === 'Day'
          ? `DÍA ${i + 1}`
          : viewMode === 'Week'
          ? `SEMANA ${weekNum}`
          : `SEMANA ${weekNum * 2 - 1} | ${weekNum * 2}`

      intervals.push({
        label,
        startDay: startDayNum,
        daySpan: intervalDaysSpan,
      })
    }

    const labelColumnWidth = 260
    const contentWidth = Math.max(780, numIntervals * (viewMode === 'Day' ? 44 : 110))
    const totalSvgWidth = labelColumnWidth + contentWidth

    // Group tasks into categories/phases (Roots & Children)
    const rootTasks = tasks.filter((t) => !t.tareaPadreId)
    const groupedRows: { type: 'header' | 'task'; task?: GanttTask; title?: string }[] = []

    if (rootTasks.length > 0) {
      rootTasks.forEach((root) => {
        groupedRows.push({ type: 'header', title: root.name, task: root })
        const children = tasks.filter((t) => t.tareaPadreId === Number(root.id))
        if (children.length > 0) {
          children.forEach((c) => groupedRows.push({ type: 'task', task: c }))
        }
      })

      // Include orphan subtasks if any
      const orphanTasks = tasks.filter(
        (t) => t.tareaPadreId && !rootTasks.some((r) => Number(r.id) === t.tareaPadreId)
      )
      orphanTasks.forEach((o) => groupedRows.push({ type: 'task', task: o }))
    } else {
      tasks.forEach((t) => groupedRows.push({ type: 'task', task: t }))
    }

    return {
      projectStartDate,
      projectEndDate,
      totalDays,
      intervals,
      numIntervals,
      labelColumnWidth,
      contentWidth,
      totalSvgWidth,
      groupedRows,
    }
  }, [tasks, viewMode])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Cargando cronograma Gantt...</Text>
        </div>
      </div>
    )
  }

  if (error) {
    return <Alert title="Error" description={error} type="error" showIcon />
  }

  if (tasks.length === 0 || !timelineData) {
    return (
      <Empty
        description="Este proyecto no tiene tareas con fechas asignadas para el diagrama Gantt."
        style={{ padding: '48px 0' }}
      />
    )
  }

  const {
    projectStartDate,
    totalDays,
    intervals,
    labelColumnWidth,
    contentWidth,
    totalSvgWidth,
    groupedRows,
  } = timelineData

  const rowHeight = 42
  const headerHeight = 50
  const totalSvgHeight = headerHeight + groupedRows.length * rowHeight + 20

  // Calculate X coordinate for any date
  const getX = (dateStr: string) => {
    const d = parseLocalDate(dateStr)
    const diffDays = (d.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)
    const ratio = Math.min(Math.max(diffDays / totalDays, 0), 1)
    return labelColumnWidth + ratio * contentWidth
  }

  const formatCurrency = (value: number) => {
    return 'Bs ' + value.toLocaleString('es-BO', { minimumFractionDigits: 2 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Summary Stats Cards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<Text style={{ fontSize: 12, color: '#64748b' }}>Avance del Proyecto</Text>}
              value={stats.promedio}
              suffix="%"
              valueStyle={{ color: '#2563eb', fontWeight: 800, fontSize: 20 }}
            />
            <Progress percent={stats.promedio} showInfo={false} strokeColor="#2563eb" style={{ marginTop: 8 }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<Text style={{ fontSize: 12, color: '#64748b' }}><CheckCircleOutlined style={{ color: '#10b981' }} /> Realizadas</Text>}
              value={stats.completadas}
              suffix={`/ ${stats.total}`}
              valueStyle={{ color: '#10b981', fontWeight: 700, fontSize: 20 }}
            />
            <Text style={{ fontSize: 11, color: '#64748b' }}>100% completadas</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<Text style={{ fontSize: 12, color: '#64748b' }}><SyncOutlined style={{ color: '#06b6d4' }} /> En Curso</Text>}
              value={stats.enCurso}
              valueStyle={{ color: '#06b6d4', fontWeight: 700, fontSize: 20 }}
            />
            <Text style={{ fontSize: 11, color: '#64748b' }}>En ejecución activa</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<Text style={{ fontSize: 12, color: '#64748b' }}><ClockCircleOutlined style={{ color: '#f59e0b' }} /> Pendientes</Text>}
              value={stats.pendientes}
              valueStyle={{ color: '#f59e0b', fontWeight: 700, fontSize: 20 }}
            />
            <Text style={{ fontSize: 11, color: '#64748b' }}>Programadas</Text>
          </Card>
        </Col>
      </Row>

      {/* ── View Controls ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Title level={5} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
          Cronograma por Fases (Estilo Diagrama de Red)
        </Title>

        <Space align="center">
          <Text style={{ fontSize: 13, color: '#64748b' }}>
            Escala:
          </Text>
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="Week">Semanas</Radio.Button>
            <Radio.Button value="Day">Días</Radio.Button>
            <Radio.Button value="Month">Meses</Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      {/* ── Reference-Styled Vector Canvas |────────| ── */}
      <Card
        bodyStyle={{ padding: 0 }}
        style={{
          overflow: 'hidden',
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: 580,
            background: '#ffffff',
          }}
        >
          <svg
            width={totalSvgWidth}
            height={totalSvgHeight}
            style={{ display: 'block', background: '#ffffff' }}
          >
            <defs>
              <filter id="neonGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#06b6d4" floodOpacity="0.4" />
              </filter>
              <filter id="neonGlowGreen" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#10b981" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Header Background */}
            <rect
              x={0}
              y={0}
              width={totalSvgWidth}
              height={headerHeight}
              fill="#f8fafc"
              stroke="#e2e8f0"
              strokeWidth={1}
            />

            {/* Column Label */}
            <text
              x={16}
              y={headerHeight / 2 + 5}
              fill="#334155"
              fontSize={13}
              fontWeight={700}
            >
              Fases & Actividades
            </text>

            <line
              x1={labelColumnWidth}
              y1={0}
              x2={labelColumnWidth}
              y2={totalSvgHeight}
              stroke="#cbd5e1"
              strokeWidth={2}
            />

            {/* Interval Headers (WEEKS) */}
            {intervals.map((inter, i) => {
              const x = labelColumnWidth + (i / intervals.length) * contentWidth
              const w = contentWidth / intervals.length

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={0}
                    width={w}
                    height={headerHeight}
                    fill="transparent"
                    stroke="#e2e8f0"
                  />
                  <text
                    x={x + w / 2}
                    y={headerHeight / 2 + 4}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize={11}
                    fontWeight={700}
                    letterSpacing={0.5}
                  >
                    {inter.label}
                  </text>
                </g>
              )
            })}

            {/* Vertical Grid Background Lines */}
            {intervals.map((_, i) => {
              const x = labelColumnWidth + (i / intervals.length) * contentWidth
              return (
                <line
                  key={`grid-${i}`}
                  x1={x}
                  y1={headerHeight}
                  x2={x}
                  y2={totalSvgHeight}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
              )
            })}

            {/* Rows: Phase Headers and Task Lines |────────| */}
            {groupedRows.map((rowItem, rowIndex) => {
              const y = headerHeight + rowIndex * rowHeight
              const centerY = y + rowHeight / 2

              if (rowItem.type === 'header') {
                return (
                  <g key={`head-${rowIndex}`}>
                    {/* Phase Category Row Header */}
                    <rect
                      x={0}
                      y={y}
                      width={totalSvgWidth}
                      height={rowHeight}
                      fill="#f1f5f9"
                      stroke="#e2e8f0"
                    />
                    <text
                      x={16}
                      y={centerY + 4}
                      fill="#1e293b"
                      fontSize={13}
                      fontWeight={800}
                      letterSpacing={0.5}
                    >
                      {rowItem.title}
                    </text>
                  </g>
                )
              }

              const task = rowItem.task!
              const startX = getX(task.start)
              const endX = getX(task.end)
              const barWidth = Math.max(endX - startX, 36)
              const finalEndX = startX + barWidth
              const isDone = task.progress >= 100
              const progressWidth = (barWidth * Math.min(Math.max(task.progress, 0), 100)) / 100

              const mainColor = isDone ? '#10b981' : task.progress > 0 ? '#06b6d4' : '#94a3b8'

              return (
                <g key={`task-${task.id}`}>
                  {/* Row Background & Guide Line */}
                  <rect
                    x={0}
                    y={y}
                    width={totalSvgWidth}
                    height={rowHeight}
                    fill={isDone ? 'rgba(236, 253, 245, 0.4)' : '#ffffff'}
                    stroke="#f8fafc"
                  />

                  {/* Horizontal Guide Line across grid */}
                  <line
                    x1={labelColumnWidth}
                    y1={centerY}
                    x2={totalSvgWidth}
                    y2={centerY}
                    stroke="#f1f5f9"
                    strokeWidth={1}
                  />

                  {/* Task Title on Left */}
                  <Tooltip
                    title={
                      <div style={{ padding: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{task.name}</div>
                        <div>Estado: <b>{isDone ? 'Realizada ✓' : task.progress > 0 ? 'En Curso ⌛' : 'Pendiente ⏱'}</b></div>
                        <div>Avance: {task.progress}%</div>
                        <div>Fechas: {task.start} al {task.end}</div>
                        {task.responsableNombre && <div>Responsable: {task.responsableNombre}</div>}
                        {task.presupuestoEstimado > 0 && <div>Presupuesto: {formatCurrency(task.presupuestoEstimado)}</div>}
                      </div>
                    }
                  >
                    <text
                      x={32}
                      y={centerY + 4}
                      fill={isDone ? '#047857' : '#334155'}
                      fontSize={12}
                      fontWeight={600}
                      style={{ cursor: 'pointer' }}
                    >
                      {task.name.length > 26 ? task.name.substring(0, 24) + '...' : task.name}
                    </text>
                  </Tooltip>

                  {/* ── Reference Style Bar |──────────| ── */}
                  <g style={{ cursor: 'pointer' }}>
                    <Tooltip
                      title={
                        <div>
                          <div style={{ fontWeight: 700 }}>{task.name}</div>
                          <div>Del {task.start} al {task.end}</div>
                          <div>Avance: {task.progress}%</div>
                        </div>
                      }
                    >
                      {/* Base Line */}
                      <line
                        x1={startX}
                        y1={centerY}
                        x2={finalEndX}
                        y2={centerY}
                        stroke={mainColor}
                        strokeWidth={4}
                        strokeLinecap="round"
                        filter={isDone ? 'url(#neonGlowGreen)' : 'url(#neonGlowCyan)'}
                      />

                      {/* Start Cap | */}
                      <line
                        x1={startX}
                        y1={centerY - 9}
                        x2={startX}
                        y2={centerY + 9}
                        stroke={mainColor}
                        strokeWidth={3}
                        strokeLinecap="round"
                      />

                      {/* End Cap | */}
                      <line
                        x1={finalEndX}
                        y1={centerY - 9}
                        x2={finalEndX}
                        y2={centerY + 9}
                        stroke={mainColor}
                        strokeWidth={3}
                        strokeLinecap="round"
                      />

                      {/* Progress Fill Overlay line */}
                      {!isDone && progressWidth > 0 && (
                        <line
                          x1={startX}
                          y1={centerY}
                          x2={startX + progressWidth}
                          y2={centerY}
                          stroke="#10b981"
                          strokeWidth={5}
                          strokeLinecap="round"
                        />
                      )}

                      {/* Status Checkmark or Percentage */}
                      {isDone ? (
                        <g transform={`translate(${finalEndX + 8}, ${centerY - 9})`}>
                          <rect x={0} y={0} width={48} height={18} rx={9} fill="#d1fae5" stroke="#10b981" strokeWidth={1} />
                          <text x={24} y={13} textAnchor="middle" fill="#047857" fontSize={10} fontWeight={800}>
                            ✓ 100%
                          </text>
                        </g>
                      ) : (
                        <text
                          x={finalEndX + 8}
                          y={centerY + 4}
                          fill="#475569"
                          fontSize={11}
                          fontWeight={700}
                        >
                          {task.progress}%
                        </text>
                      )}
                    </Tooltip>
                  </g>
                </g>
              )
            })}
          </svg>
        </div>
      </Card>
    </div>
  )
}
