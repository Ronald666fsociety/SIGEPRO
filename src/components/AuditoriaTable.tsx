'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Select,
  Input,
  Button,
  Space,
  Tag,
  DatePicker,
  Typography,
  Spin,
  Alert,
} from 'antd'
import { SearchOutlined, ClearOutlined } from '@ant-design/icons'
import type { Auditoria, PaginatedResponse } from '@/types'
import type { Dayjs } from 'dayjs'

const { Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

const ACCION_COLORS: Record<string, string> = {
  CREAR: 'green',
  ACTUALIZAR: 'blue',
  ELIMINAR: 'red',
}

const ACCION_LABELS: Record<string, string> = {
  CREAR: 'Creación',
  ACTUALIZAR: 'Actualización',
  ELIMINAR: 'Eliminación',
}

const ENTIDAD_OPTIONS = [
  'Proyecto',
  'Tarea',
  'Usuario',
  'DependenciaTarea',
  'Asignacion',
]

export default function AuditoriaTable() {
  const [data, setData] = useState<Auditoria[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(100)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [entidad, setEntidad] = useState<string | undefined>()
  const [entidadId, setEntidadId] = useState<string>('')
  const [usuarioId, setUsuarioId] = useState<string>('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  const fetchData = useCallback(async (p: number = page) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')
      const params = new URLSearchParams()
      params.set('page', String(p))
      params.set('limit', String(limit))

      if (entidad) params.set('entidad', entidad)
      if (entidadId) params.set('entidadId', entidadId)
      if (usuarioId) params.set('usuarioId', usuarioId)
      if (dateRange?.[0]) params.set('fechaDesde', dateRange[0].toISOString())
      if (dateRange?.[1]) params.set('fechaHasta', dateRange[1].toISOString())

      const res = await fetch(`/api/auditoria?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Acceso denegado. Solo administradores pueden ver auditoría.')
        }
        throw new Error('Error al cargar auditoría')
      }

      const result: PaginatedResponse<Auditoria> = await res.json()
      setData(result.data)
      setTotal(result.total)
      setPage(result.page)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [entidad, entidadId, usuarioId, dateRange, limit, page])

  useEffect(() => {
    fetchData(1)
  }, [])

  const handleFilter = () => {
    setPage(1)
    fetchData(1)
  }

  const handleClear = () => {
    setEntidad(undefined)
    setEntidadId('')
    setUsuarioId('')
    setDateRange(null)
    setPage(1)
    fetchData(1)
  }

  const handleTableChange = (pagination: { current?: number }) => {
    const newPage = pagination.current ?? 1
    setPage(newPage)
    fetchData(newPage)
  }

  const columns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha: string) =>
        new Date(fecha).toLocaleString('es-AR'),
    },
    {
      title: 'Usuario',
      dataIndex: 'nombreUsuario',
      key: 'nombreUsuario',
    },
    {
      title: 'Acción',
      dataIndex: 'accion',
      key: 'accion',
      render: (accion: string) => (
        <Tag color={ACCION_COLORS[accion] ?? 'default'}>
          {ACCION_LABELS[accion] ?? accion}
        </Tag>
      ),
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
    },
    {
      title: 'ID Entidad',
      dataIndex: 'entidadId',
      key: 'entidadId',
    },
  ]

  return (
    <div>
      {/* ── Filter bar ── */}
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size="middle">
        <Select
          placeholder="Entidad"
          value={entidad}
          onChange={setEntidad}
          allowClear
          style={{ width: 180 }}
        >
          {ENTIDAD_OPTIONS.map((e) => (
            <Option key={e} value={e}>
              {e}
            </Option>
          ))}
        </Select>

        <Input
          placeholder="ID Entidad"
          value={entidadId}
          onChange={(e) => setEntidadId(e.target.value)}
          style={{ width: 120 }}
          type="number"
        />

        <Input
          placeholder="ID Usuario"
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          style={{ width: 120 }}
          type="number"
        />

        <RangePicker
          value={dateRange as any}
          onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
        />

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleFilter}
        >
          Filtrar
        </Button>

        <Button icon={<ClearOutlined />} onClick={handleClear}>
          Limpiar
        </Button>
      </Space>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert title="Error" description={error} type="error" showIcon />
      ) : (
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showTotal: (total: number) =>
              `Total: ${total} registro${total !== 1 ? 's' : ''}`,
          }}
          onChange={handleTableChange as any}
          size="middle"
          bordered
          locale={{
            emptyText: 'No se encontraron registros de auditoría',
          }}
        />
      )}
    </div>
  )
}
