'use client'

import React, { useState } from 'react'
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  Popconfirm,
  message,
  Typography,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { DependenciaTarea, Tarea } from '@/types'

const { Text } = Typography
const { Option } = Select

const TIPO_LABELS: Record<string, string> = {
  FIN_INICIO: 'Fin → Inicio',
  INICIO_INICIO: 'Inicio → Inicio',
  FIN_FIN: 'Fin → Fin',
  INICIO_FIN: 'Inicio → Fin',
}

const TIPO_COLORS: Record<string, string> = {
  FIN_INICIO: 'blue',
  INICIO_INICIO: 'green',
  FIN_FIN: 'orange',
  INICIO_FIN: 'purple',
}

interface DependenciaListProps {
  dependencias: DependenciaTarea[]
  tareas: Tarea[]
  puedeEditar: boolean
  onDependenciaChange: () => void
}

export default function DependenciaList({
  dependencias,
  tareas,
  puedeEditar,
  onDependenciaChange,
}: DependenciaListProps) {
  const [adding, setAdding] = useState(false)
  const [tareaOrigenId, setTareaOrigenId] = useState<number | undefined>()
  const [tareaDestinoId, setTareaDestinoId] = useState<number | undefined>()
  const [tipo, setTipo] = useState<string>('FIN_INICIO')
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async () => {
    if (!tareaOrigenId || !tareaDestinoId) {
      message.warning('Seleccione ambas tareas')
      return
    }
    if (tareaOrigenId === tareaDestinoId) {
      message.warning('Las tareas deben ser diferentes')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/dependencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ tareaOrigenId, tareaDestinoId, tipo }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear dependencia')
      }

      message.success('Dependencia creada correctamente')
      setAdding(false)
      setTareaOrigenId(undefined)
      setTareaDestinoId(undefined)
      setTipo('FIN_INICIO')
      onDependenciaChange()
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/dependencias/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar dependencia')
      }

      message.success('Dependencia eliminada')
      onDependenciaChange()
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(err.message)
      }
    }
  }

  const columns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Predecesora',
      key: 'origen',
      render: (_: unknown, record: DependenciaTarea) =>
        record.nombreTareaOrigen ?? `Tarea #${record.tareaOrigenId}`,
    },
    {
      title: 'Sucesora',
      key: 'destino',
      render: (_: unknown, record: DependenciaTarea) =>
        record.nombreTareaDestino ?? `Tarea #${record.tareaDestinoId}`,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      render: (tipo: string) => (
        <Tag color={TIPO_COLORS[tipo] ?? 'default'}>
          {TIPO_LABELS[tipo] ?? tipo}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_: unknown, record: DependenciaTarea) =>
        puedeEditar ? (
          <Popconfirm
            title="Eliminar dependencia"
            description="¿Está seguro?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ) : null,
    },
  ]

  return (
    <div>
      {puedeEditar && (
        <div style={{ marginBottom: 16 }}>
          {!adding ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAdding(true)}
            >
              Nueva Dependencia
            </Button>
          ) : (
            <Space style={{ flexWrap: 'wrap' }}>
              <Select
                placeholder="Tarea predecesora"
                value={tareaOrigenId}
                onChange={setTareaOrigenId}
                style={{ width: 220 }}
                showSearch
                optionFilterProp="children"
              >
                {tareas.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.nombre}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Tarea sucesora"
                value={tareaDestinoId}
                onChange={setTareaDestinoId}
                style={{ width: 220 }}
                showSearch
                optionFilterProp="children"
              >
                {tareas.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.nombre}
                  </Option>
                ))}
              </Select>
              <Select
                value={tipo}
                onChange={setTipo}
                style={{ width: 160 }}
              >
                <Option value="FIN_INICIO">Fin → Inicio</Option>
                <Option value="INICIO_INICIO">Inicio → Inicio</Option>
                <Option value="FIN_FIN">Fin → Fin</Option>
                <Option value="INICIO_FIN">Inicio → Fin</Option>
              </Select>
              <Button type="primary" onClick={handleAdd} loading={submitting}>
                Guardar
              </Button>
              <Button onClick={() => setAdding(false)}>Cancelar</Button>
            </Space>
          )}
        </div>
      )}

      <Table
        dataSource={dependencias}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        bordered
        locale={{ emptyText: 'No hay dependencias registradas' }}
      />
    </div>
  )
}
