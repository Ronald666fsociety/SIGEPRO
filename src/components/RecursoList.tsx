'use client'

import React, { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Select,
  InputNumber,
  Popconfirm,
  message,
  Typography,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Asignacion, Tarea, Usuario } from '@/types'

const { Text } = Typography
const { Option } = Select

interface RecursoListProps {
  asignaciones: Asignacion[]
  tareas: Tarea[]
  usuarios: Usuario[]
  puedeEditar: boolean
  onAsignacionChange: () => void
}

export default function RecursoList({
  asignaciones,
  tareas,
  usuarios,
  puedeEditar,
  onAsignacionChange,
}: RecursoListProps) {
  const [adding, setAdding] = useState(false)
  const [tareaId, setTareaId] = useState<number | undefined>()
  const [usuarioId, setUsuarioId] = useState<number | undefined>()
  const [horasEstimadas, setHorasEstimadas] = useState(0)
  const [horasReales, setHorasReales] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async () => {
    if (!tareaId || !usuarioId) {
      message.warning('Seleccione una tarea y un usuario')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/asignaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          tareaId,
          usuarioId,
          horasEstimadas,
          horasReales,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear asignación')
      }

      message.success('Asignación creada correctamente')
      setAdding(false)
      setTareaId(undefined)
      setUsuarioId(undefined)
      setHorasEstimadas(0)
      setHorasReales(0)
      onAsignacionChange()
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
      const res = await fetch(`/api/asignaciones/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar asignación')
      }

      message.success('Asignación eliminada')
      onAsignacionChange()
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
      title: 'Tarea',
      key: 'tarea',
      render: (_: unknown, record: Asignacion) =>
        record.nombreTarea ?? `Tarea #${record.tareaId}`,
    },
    {
      title: 'Usuario',
      key: 'usuario',
      render: (_: unknown, record: Asignacion) =>
        record.nombreUsuario ?? `Usuario #${record.usuarioId}`,
    },
    {
      title: 'Hrs Est.',
      dataIndex: 'horasEstimadas',
      key: 'horasEstimadas',
      width: 90,
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'Hrs Reales',
      dataIndex: 'horasReales',
      key: 'horasReales',
      width: 90,
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 80,
      render: (_: unknown, record: Asignacion) =>
        puedeEditar ? (
          <Popconfirm
            title="Eliminar asignación"
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
              Agregar Asignación
            </Button>
          ) : (
            <Space style={{ flexWrap: 'wrap' }}>
              <Select
                placeholder="Seleccionar tarea"
                value={tareaId}
                onChange={setTareaId}
                style={{ width: 200 }}
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
                placeholder="Seleccionar usuario"
                value={usuarioId}
                onChange={setUsuarioId}
                style={{ width: 180 }}
                showSearch
                optionFilterProp="children"
              >
                {usuarios.map((u) => (
                  <Option key={u.id} value={u.id}>
                    {u.nombre}
                  </Option>
                ))}
              </Select>
              <InputNumber
                placeholder="Hrs Estimadas"
                value={horasEstimadas}
                onChange={(val) => setHorasEstimadas(val ?? 0)}
                min={0}
                step={0.5}
                style={{ width: 130 }}
              />
              <InputNumber
                placeholder="Hrs Reales"
                value={horasReales}
                onChange={(val) => setHorasReales(val ?? 0)}
                min={0}
                step={0.5}
                style={{ width: 120 }}
              />
              <Button type="primary" onClick={handleAdd} loading={submitting}>
                Guardar
              </Button>
              <Button onClick={() => setAdding(false)}>Cancelar</Button>
            </Space>
          )}
        </div>
      )}

      <Table
        dataSource={asignaciones}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        bordered
        locale={{ emptyText: 'No hay asignaciones registradas' }}
      />
    </div>
  )
}
