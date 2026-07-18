'use client'

import React, { useState } from 'react'
import {
  Table,
  Tag,
  Progress,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Popconfirm,
  message,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SubnodeOutlined,
} from '@ant-design/icons'
import type { Tarea, Usuario } from '@/types'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface TareaTreeProps {
  tareas: Tarea[]
  usuarios: Usuario[]
  puedeEditar: boolean
  usuarioActual: { id: number; rol: string }
  onTareaChange: () => void
}

interface TareaFormValues {
  nombre: string
  descripcion?: string
  fechaInicio?: string
  fechaFin?: string
  presupuestoEstimado: number
  costoEjecutado: number
  responsableId?: number | null
  tareaPadreId?: number | null
}

export default function TareaTree({
  tareas,
  usuarios,
  puedeEditar,
  usuarioActual,
  onTareaChange,
}: TareaTreeProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editProgreso, setEditProgreso] = useState<{
    id: number
    value: number
  } | null>(null)
  const [form] = Form.useForm<TareaFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [parentTareaId, setParentTareaId] = useState<number | null>(null)

  // ── Build tree structure ──
  const buildTree = (flat: Tarea[]): Tarea[] => {
    const map = new Map<number, Tarea>()
    flat.forEach((t) => map.set(t.id, { ...t, hijos: [] }))
    const roots: Tarea[] = []
    flat.forEach((t) => {
      if (t.tareaPadreId && map.has(t.tareaPadreId)) {
        const parent = map.get(t.tareaPadreId)!
        if (!parent.hijos) parent.hijos = []
        parent.hijos.push(map.get(t.id)!)
      } else if (!t.tareaPadreId) {
        roots.push(map.get(t.id)!)
      }
    })
    return roots
  }

  const treeData = buildTree(tareas)

  // Flatten tree for table display
  const flattenTree = (nodes: Tarea[], level = 0): (Tarea & { _level: number })[] => {
    const result: (Tarea & { _level: number })[] = []
    for (const node of nodes) {
      result.push({ ...node, _level: level })
      if (node.hijos && node.hijos.length > 0) {
        result.push(...flattenTree(node.hijos, level + 1))
      }
    }
    return result
  }

  const flatRows = flattenTree(treeData)

  // ── Handlers ──

  const handleAddTarea = (tareaPadreId?: number) => {
    setParentTareaId(tareaPadreId ?? null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleSubmitTarea = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const payload: Record<string, unknown> = {
        nombre: values.nombre,
        descripcion: values.descripcion ?? null,
        presupuestoEstimado: values.presupuestoEstimado ?? 0,
        costoEjecutado: values.costoEjecutado ?? 0,
        proyectoId: tareas[0]?.proyectoId,
      }

      if (values.fechaInicio) payload.fechaInicio = values.fechaInicio
      if (values.fechaFin) payload.fechaFin = values.fechaFin
      if (values.responsableId) payload.responsableId = values.responsableId
      if (parentTareaId) payload.tareaPadreId = parentTareaId

      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear tarea')
      }

      message.success('Tarea creada correctamente')
      setModalOpen(false)
      onTareaChange()
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateProgreso = async () => {
    if (!editProgreso) return

    try {
      const res = await fetch(`/api/tareas/${editProgreso.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ progreso: editProgreso.value }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar progreso')
      }

      message.success('Progreso actualizado')
      setEditProgreso(null)
      onTareaChange()
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(err.message)
      }
    }
  }

  const handleDeleteTarea = async (id: number) => {
    try {
      const res = await fetch(`/api/tareas/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar tarea')
      }

      message.success('Tarea eliminada correctamente')
      onTareaChange()
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(err.message)
      }
    }
  }

  const formatCurrency = (value: number) => {
    return 'Bs ' + value.toLocaleString('es-BO', { minimumFractionDigits: 2 })
  }

  // ── Columns ──

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 200,
      render: (nombre: string, record: Tarea & { _level: number }) => (
        <span style={{ paddingLeft: record._level * 24 }}>
          {record._level > 0 && <SubnodeOutlined style={{ marginRight: 8, color: '#1677ff' }} />}
          {nombre}
        </span>
      ),
    },
    {
      title: 'Inicio',
      dataIndex: 'fechaInicio',
      key: 'fechaInicio',
      width: 100,
      render: (val: string | null) =>
        val ? new Date(val).toLocaleDateString('es-AR') : '—',
    },
    {
      title: 'Fin',
      dataIndex: 'fechaFin',
      key: 'fechaFin',
      width: 100,
      render: (val: string | null) =>
        val ? new Date(val).toLocaleDateString('es-AR') : '—',
    },
    {
      title: '% Avance',
      dataIndex: 'progreso',
      key: 'progreso',
      width: 180,
      render: (progreso: number, record: Tarea) => (
        <Space>
          <Progress
            percent={progreso}
            size="small"
            style={{ width: 100 }}
            status={progreso >= 100 ? 'success' : 'active'}
            format={() => `${progreso}%`}
          />
          {usuarioActual.rol !== 'ADMINISTRADOR' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() =>
                setEditProgreso({ id: record.id, value: progreso })
              }
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Responsable',
      dataIndex: 'responsableNombre',
      key: 'responsable',
      width: 140,
      render: (val: string | null) => val ?? '—',
    },
    {
      title: 'Presupuesto (Bs)',
      dataIndex: 'presupuestoEstimado',
      key: 'presupuesto',
      width: 130,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Costo (Bs)',
      dataIndex: 'costoEjecutado',
      key: 'costo',
      width: 130,
      render: (val: number) => (
        <Text style={{ color: val > 0 ? '#ff4d4f' : undefined }}>
          {formatCurrency(val)}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 140,
      render: (_: unknown, record: Tarea) =>
        puedeEditar ? (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddTarea(record.id)}
            >
              Sub
            </Button>
            <Popconfirm
              title="Eliminar tarea"
              description="¿Está seguro?"
              onConfirm={() => handleDeleteTarea(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ) : null,
    },
  ]

  // ── Render ──

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        {puedeEditar && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleAddTarea()}
          >
            Nueva Tarea
          </Button>
        )}
        <Text type="secondary">
          {tareas.length} tarea{tareas.length !== 1 ? 's' : ''} en total
        </Text>
      </Space>

      <Table
        dataSource={flatRows}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 1200 }}
        rowClassName={(record: Tarea & { _level: number }) =>
          record._level === 0 ? 'table-primary' : ''
        }
        locale={{ emptyText: 'No hay tareas registradas' }}
      />

      {/* ── Create tarea modal ── */}
      <Modal
        title={parentTareaId ? 'Nueva Subtarea' : 'Nueva Tarea'}
        open={modalOpen}
        onOk={handleSubmitTarea}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="Crear"
        cancelText="Cancelar"
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" initialValues={{ presupuestoEstimado: 0, costoEjecutado: 0 }}>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input placeholder="Nombre de la tarea" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <TextArea rows={2} placeholder="Descripción (opcional)" />
          </Form.Item>
          <Form.Item name="responsableId" label="Responsable">
            <Select
              placeholder="Seleccionar responsable"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {usuarios.map((u) => (
                <Option key={u.id} value={u.id}>
                  {u.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="fechaInicio" label="Fecha de Inicio">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="fechaFin" label="Fecha de Fin">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="presupuestoEstimado"
            label="Presupuesto Estimado (Bs)"
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              prefix="Bs "
            />
          </Form.Item>
          <Form.Item
            name="costoEjecutado"
            label="Costo Ejecutado (Bs)"
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              prefix="Bs "
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Edit progreso modal ── */}
      <Modal
        title="Actualizar Progreso"
        open={!!editProgreso}
        onOk={handleUpdateProgreso}
        onCancel={() => setEditProgreso(null)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <p>Ingrese el porcentaje de avance (0–100):</p>
        <InputNumber
          min={0}
          max={100}
          value={editProgreso?.value}
          onChange={(val) =>
            setEditProgreso((prev) =>
              prev ? { ...prev, value: val ?? 0 } : null
            )
          }
          style={{ width: '100%' }}
          formatter={(value) => `${value}%`}
          parser={(value) => parseInt(value?.replace('%', '') ?? '0', 10)}
        />
      </Modal>
    </div>
  )
}
