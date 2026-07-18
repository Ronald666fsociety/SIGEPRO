'use client'

import React, { useEffect } from 'react'
import { Modal, Form, Input, Select, DatePicker, InputNumber } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { Proyecto, Usuario } from '@/types'

const { Option } = Select
const { TextArea } = Input

const ESTADOS = [
  { value: 'PLANIFICADO', label: 'Planificado' },
  { value: 'EN_CURSO', label: 'En Curso' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

interface ProyectoFormValues {
  codigo: string
  nombre: string
  descripcion?: string
  presupuestoTotal: number
  estado: string
  fechaInicio?: Dayjs
  fechaFin?: Dayjs
  jefeProyectoId: number
}

interface ProyectoModalProps {
  open: boolean
  proyecto?: Proyecto | null // null = create mode
  usuarios: Usuario[]
  onCancel: () => void
  onSubmit: (values: {
    codigo: string
    nombre: string
    descripcion?: string
    presupuestoTotal: number
    estado: string
    fechaInicio?: string
    fechaFin?: string
    jefeProyectoId: number
  }) => Promise<void>
  loading?: boolean
}

export default function ProyectoModal({
  open,
  proyecto,
  usuarios,
  onCancel,
  onSubmit,
  loading = false,
}: ProyectoModalProps) {
  const [form] = Form.useForm<ProyectoFormValues>()
  const isEdit = !!proyecto

  useEffect(() => {
    if (open) {
      if (proyecto) {
        form.setFieldsValue({
          codigo: proyecto.codigo,
          nombre: proyecto.nombre,
          descripcion: proyecto.descripcion ?? undefined,
          presupuestoTotal: proyecto.presupuestoTotal,
          estado: proyecto.estado,
          fechaInicio: proyecto.fechaInicio ? dayjs(proyecto.fechaInicio) : undefined,
          fechaFin: proyecto.fechaFin ? dayjs(proyecto.fechaFin) : undefined,
          jefeProyectoId: proyecto.jefeProyectoId,
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, proyecto, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      // Convert dayjs objects back to ISO strings for the API
      await onSubmit({
        codigo: values.codigo,
        nombre: values.nombre,
        descripcion: values.descripcion,
        presupuestoTotal: values.presupuestoTotal,
        estado: values.estado ?? 'PLANIFICADO',
        fechaInicio: values.fechaInicio?.toISOString(),
        fechaFin: values.fechaFin?.toISOString(),
        jefeProyectoId: values.jefeProyectoId,
      })
      form.resetFields()
    } catch {
      // validation errors are displayed by form
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={isEdit ? 'Guardar Cambios' : 'Crear Proyecto'}
      cancelText="Cancelar"
      destroyOnHidden
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ presupuestoTotal: 0, estado: 'PLANIFICADO' }}
      >
        <Form.Item
          name="codigo"
          label="Código"
          rules={[
            { required: true, message: 'El código es requerido' },
            { max: 50, message: 'Máximo 50 caracteres' },
          ]}
        >
          <Input placeholder="Ej: PROJ-001" disabled={loading} />
        </Form.Item>

        <Form.Item
          name="nombre"
          label="Nombre"
          rules={[
            { required: true, message: 'El nombre es requerido' },
            { max: 200, message: 'Máximo 200 caracteres' },
          ]}
        >
          <Input placeholder="Nombre del proyecto" disabled={loading} />
        </Form.Item>

        <Form.Item name="descripcion" label="Descripción">
          <TextArea
            rows={3}
            placeholder="Descripción del proyecto"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          name="jefeProyectoId"
          label="Jefe de Proyecto"
          rules={[{ required: true, message: 'Seleccione un jefe de proyecto' }]}
        >
          <Select
            placeholder="Seleccionar jefe de proyecto"
            loading={loading}
            disabled={loading}
            showSearch
            optionFilterProp="children"
          >
            {usuarios.map((u) => (
              <Option key={u.id} value={u.id}>
                {u.nombre} ({u.email})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="presupuestoTotal"
          label="Presupuesto Total"
          rules={[
            { required: true, message: 'El presupuesto es requerido' },
            { type: 'number', min: 0, message: 'El presupuesto debe ser >= 0' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            prefix="Bs "
            placeholder="0.00"
            disabled={loading}
          />
        </Form.Item>

        {isEdit && (
          <Form.Item name="estado" label="Estado">
            <Select disabled={loading}>
              {ESTADOS.map((e) => (
                <Option key={e.value} value={e.value}>
                  {e.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item name="fechaInicio" label="Fecha de Inicio">
          <DatePicker
            style={{ width: '100%' }}
            disabled={loading}
            placeholder="Seleccionar fecha"
          />
        </Form.Item>

        <Form.Item
          name="fechaFin"
          label="Fecha de Fin"
          dependencies={['fechaInicio']}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                const inicio = getFieldValue('fechaInicio')
                if (inicio && value && value.isBefore(inicio)) {
                  return Promise.reject(
                    new Error('La fecha de fin debe ser posterior a la de inicio')
                  )
                }
                return Promise.resolve()
              },
            }),
          ]}
        >
          <DatePicker
            style={{ width: '100%' }}
            disabled={loading}
            placeholder="Seleccionar fecha"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
