'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Card,
  Select,
  Button,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Spin,
  Alert,
  Space,
} from 'antd'
import {
  DollarOutlined,
  PieChartOutlined,
  TeamOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

// ── Register Chart.js components synchronously ──

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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartTitle)

// ── Dynamic chart imports ──
const Bar = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Bar),
  { ssr: false }
)

const Doughnut = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Doughnut),
  { ssr: false }
)

const CHART_COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2']

interface PresupuestoItem {
  proyectoId: number
  proyecto: string
  presupuesto: number
  costoReal: number
  diferencia: number
  estado: 'DENTRO_PRESUPUESTO' | 'SOBRE_PRESUPUESTO'
}

interface SemaforoItem {
  proyectoId: number
  proyecto: string
  avanceReal: number
  avancePlanificado: number
  retrasoPorcentaje: number
  sobreCostoPorcentaje: number
  color: 'VERDE' | 'AMARILLO' | 'ROJO'
}

interface CargaTrabajoItem {
  usuario: string
  totalHorasEstimadas: number
  totalHorasReales: number
  tareas: string[]
}

interface ProyectoOption {
  id: number
  nombre: string
}

interface UsuarioOption {
  id: number
  nombre: string
}

export default function ReportesView() {
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([])

  // Presupuesto vs Costo
  const [presupuestoData, setPresupuestoData] = useState<PresupuestoItem[]>([])
  const [presupuestoLoading, setPresupuestoLoading] = useState(false)

  // Semáforo
  const [semaforoData, setSemaforoData] = useState<SemaforoItem[]>([])
  const [semaforoLoading, setSemaforoLoading] = useState(false)
  const [selectedProyectoSemaforo, setSelectedProyectoSemaforo] = useState<number | undefined>()

  // Carga de Trabajo
  const [cargaData, setCargaData] = useState<CargaTrabajoItem[]>([])
  const [cargaLoading, setCargaLoading] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<number | undefined>()

  // Fetch initial data
  useEffect(() => {
    const token = localStorage.getItem('auth_token')

    fetch('/api/proyectos', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setProyectos(data))
      .catch(() => {})

    fetch('/api/usuarios', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setUsuarios(data))
      .catch(() => {})

    // Load presupuesto report by default
    loadPresupuesto()
    loadSemaforo()
  }, [])

  const loadPresupuesto = async () => {
    setPresupuestoLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/reportes/presupuesto-vs-costo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setPresupuestoData(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setPresupuestoLoading(false)
    }
  }

  const loadSemaforo = async () => {
    setSemaforoLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/reportes/semaforo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setSemaforoData(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setSemaforoLoading(false)
    }
  }

  const loadCargaTrabajo = async (usuarioId?: number) => {
    setCargaLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/reportes/carga-trabajo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setCargaData(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setCargaLoading(false)
    }
  }

  // ── Selected project for presupuesto ──
  const selectedPresupuesto = presupuestoData.find(
    (p) => p.proyectoId === selectedProyectoSemaforo
  )

  const selectedSemaforoItem = semaforoData.find(
    (s) => s.proyectoId === selectedProyectoSemaforo
  )

  // ── Bar chart: presupuesto vs costo ──
  const presupuestoBarData = {
    labels: presupuestoData.map((p) => p.proyecto),
    datasets: [
      {
        label: 'Presupuesto',
        data: presupuestoData.map((p) => p.presupuesto),
        backgroundColor: CHART_COLORS[0],
        borderRadius: 4,
      },
      {
        label: 'Costo Real',
        data: presupuestoData.map((p) => p.costoReal),
        backgroundColor: CHART_COLORS[2],
        borderRadius: 4,
      },
    ],
  }

  const presupuestoColumns = [
    { title: 'Proyecto', dataIndex: 'proyecto', key: 'proyecto' },
    {
      title: 'Presupuesto',
      dataIndex: 'presupuesto',
      key: 'presupuesto',
      align: 'right' as const,
      render: (v: number) => 'Bs ' + v.toLocaleString('es-BO', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Costo Real',
      dataIndex: 'costoReal',
      key: 'costoReal',
      align: 'right' as const,
      render: (v: number) => 'Bs ' + v.toLocaleString('es-BO', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Diferencia',
      dataIndex: 'diferencia',
      key: 'diferencia',
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {v >= 0 ? '+' : ''}
          {'Bs ' + v.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) => (
        <Tag color={estado === 'DENTRO_PRESUPUESTO' ? 'green' : 'red'}>
          {estado === 'DENTRO_PRESUPUESTO'
            ? 'Dentro del Presupuesto'
            : 'Sobre Presupuesto'}
        </Tag>
      ),
    },
  ]

  // ── Semáforo ──
  const COLOR_MAP = {
    VERDE: '#52c41a',
    AMARILLO: '#faad14',
    ROJO: '#ff4d4f',
  }

  const semaforoDoughnutData = selectedSemaforoItem
    ? {
        labels: ['Avance Real', 'Restante'],
        datasets: [
          {
            data: [selectedSemaforoItem.avanceReal, 100 - selectedSemaforoItem.avanceReal],
            backgroundColor: [
              COLOR_MAP[selectedSemaforoItem.color],
              '#f0f0f0',
            ],
            borderWidth: 0,
          },
        ],
      }
    : null

  // ── Carga de trabajo bar chart ──
  const cargaBarData = {
    labels: cargaData.map((c) => c.usuario),
    datasets: [
      {
        label: 'Horas Estimadas',
        data: cargaData.map((c) => c.totalHorasEstimadas),
        backgroundColor: CHART_COLORS[0],
        borderRadius: 4,
      },
      {
        label: 'Horas Reales',
        data: cargaData.map((c) => c.totalHorasReales),
        backgroundColor: CHART_COLORS[1],
        borderRadius: 4,
      },
    ],
  }

  const cargaColumns = [
    { title: 'Usuario', dataIndex: 'usuario', key: 'usuario' },
    {
      title: 'Horas Est.',
      dataIndex: 'totalHorasEstimadas',
      key: 'totalHorasEstimadas',
      align: 'right' as const,
      render: (v: number) => v.toFixed(2),
    },
    {
      title: 'Horas Reales',
      dataIndex: 'totalHorasReales',
      key: 'totalHorasReales',
      align: 'right' as const,
      render: (v: number) => v.toFixed(2),
    },
    {
      title: 'Tareas Asignadas',
      dataIndex: 'tareas',
      key: 'tareas',
      render: (tareas: string[]) => tareas.join(', '),
    },
  ]

  return (
    <Row gutter={[24, 24]}>
        {/* ── Presupuesto vs Costo ── */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <DollarOutlined />
                <span>Presupuesto vs Costo</span>
              </Space>
            }
            extra={
              <Button onClick={loadPresupuesto} loading={presupuestoLoading}>
                Consultar
              </Button>
            }
          >
            {presupuestoLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin />
              </div>
            ) : presupuestoData.length === 0 ? (
              <Alert title="No hay datos disponibles" type="info" showIcon />
            ) : (
              <>
                <div style={{ maxHeight: 300, marginBottom: 24 }}>
                  <Bar data={presupuestoBarData} options={{ responsive: true, plugins: { legend: { position: 'bottom' as const } } }} />
                </div>
                <Table
                  dataSource={presupuestoData}
                  columns={presupuestoColumns}
                  rowKey="proyectoId"
                  pagination={false}
                  size="small"
                  bordered
                />
              </>
            )}
          </Card>
        </Col>

        {/* ── Semáforo ── */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <PieChartOutlined />
                <span>Semáforo de Proyectos</span>
              </Space>
            }
            extra={
              <Button onClick={loadSemaforo} loading={semaforoLoading}>
                Consultar
              </Button>
            }
          >
            {semaforoLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin />
              </div>
            ) : semaforoData.length === 0 ? (
              <Alert title="No hay datos disponibles" type="info" showIcon />
            ) : (
              <Row gutter={24}>
                <Col xs={24} md={8}>
                  <Select
                    placeholder="Seleccionar proyecto"
                    value={selectedProyectoSemaforo}
                    onChange={setSelectedProyectoSemaforo}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                  >
                    {semaforoData.map((s) => (
                      <Option key={s.proyectoId} value={s.proyectoId}>
                        {s.proyecto}
                      </Option>
                    ))}
                  </Select>

                  {selectedSemaforoItem && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          backgroundColor: COLOR_MAP[selectedSemaforoItem.color],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '16px auto',
                        }}
                      >
                        <Text strong style={{ color: '#fff', fontSize: 18 }}>
                          {selectedSemaforoItem.color}
                        </Text>
                      </div>

                      <Statistic
                        title="Avance Real"
                        value={selectedSemaforoItem.avanceReal}
                        suffix="%"
                      />
                      <Statistic
                        title="Avance Planificado"
                        value={selectedSemaforoItem.avancePlanificado}
                        suffix="%"
                      />
                      <Statistic
                        title="Retraso"
                        value={selectedSemaforoItem.retrasoPorcentaje}
                        suffix="%"
                        valueStyle={{
                          color:
                            selectedSemaforoItem.retrasoPorcentaje > 0
                              ? '#ff4d4f'
                              : '#52c41a',
                        }}
                      />
                    </div>
                  )}
                </Col>
                <Col xs={24} md={16}>
                  {semaforoDoughnutData && (
                    <div style={{ maxHeight: 300 }}>
                      <Doughnut
                        data={semaforoDoughnutData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: 'bottom' as const },
                          },
                        }}
                      />
                    </div>
                  )}
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        {/* ── Carga de Trabajo ── */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>Carga de Trabajo</span>
              </Space>
            }
            extra={
              <Button onClick={() => loadCargaTrabajo()} loading={cargaLoading}>
                Consultar
              </Button>
            }
          >
            {cargaLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin />
              </div>
            ) : cargaData.length === 0 ? (
              <Alert title="No hay datos de carga de trabajo" type="info" showIcon />
            ) : (
              <>
                <div style={{ maxHeight: 300, marginBottom: 24 }}>
                  <Bar
                    data={cargaBarData}
                    options={{
                      responsive: true,
                      indexAxis: 'y' as const,
                      plugins: { legend: { position: 'bottom' as const } },
                    }}
                  />
                </div>
                <Table
                  dataSource={cargaData}
                  columns={cargaColumns}
                  rowKey="usuario"
                  pagination={false}
                  size="small"
                  bordered
                />
              </>
            )}
          </Card>
        </Col>
      </Row>
  )
}
