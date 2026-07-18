'use client'

import React, { useState } from 'react'
import {
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Typography,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Usuario } from '@/types'

const { Option } = Select
const { Text } = Typography

const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  JEFE_PROYECTO: 'Jefe de Proyecto',
  USUARIO: 'Usuario',
}

const ROL_COLORS: Record<string, string> = {
  ADMINISTRADOR: 'red',
  JEFE_PROYECTO: 'blue',
  USUARIO: 'green',
}

interface UsuarioFormValues {
  nombre: string
  email: string
  password?: string
  rol: string
}

interface UsuarioTableProps {
  usuarios: Usuario[]
  onUsuarioChange: () => void
}

export default function UsuarioTable({
  usuarios,
  onUsuarioChange,
}: UsuarioTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editUsuario, setEditUsuario] = useState<Usuario | null>(null)
  const [form] = Form.useForm<UsuarioFormValues>()
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!editUsuario

  const openCreate = () => {
    setEditUsuario(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (usuario: Usuario) => {
    setEditUsuario(usuario)
    form.setFieldsValue({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      password: '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // Validate nombre: only letters and spaces
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(values.nombre)) {
        message.error('El nombre solo puede contener letras y espacios')
        return
      }

      const method = isEdit ? 'PUT' : 'POST'
      const url = isEdit ? `/api/usuarios/${editUsuario!.id}` : '/api/usuarios'

      const body: Record<string, unknown> = {
        nombre: values.nombre,
        email: values.email,
        rol: values.rol,
      }

      // Only include password on create, or on edit if provided
      if (!isEdit) {
        if (!values.password || values.password.length < 6) {
          message.error('La contraseña debe tener al menos 6 caracteres')
          return
        }
        body.password = values.password
      } else if (values.password) {
        body.password = values.password
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar usuario')
      }

      message.success(
        isEdit
          ? 'Usuario actualizado correctamente'
          : 'Usuario creado correctamente'
      )
      setModalOpen(false)
      onUsuarioChange()
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
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar usuario')
      }

      message.success('Usuario eliminado correctamente')
      onUsuarioChange()
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
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Rol',
      dataIndex: 'rol',
      key: 'rol',
      render: (rol: string) => (
        <Tag color={ROL_COLORS[rol] ?? 'default'}>
          {ROL_LABELS[rol] ?? rol}
        </Tag>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'red'}>
          {activo ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_: unknown, record: Usuario) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            Editar
          </Button>
          <Popconfirm
            title="Eliminar usuario"
            description="¿Está seguro de eliminar este usuario?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Table
        dataSource={usuarios}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        size="middle"
        bordered
        locale={{ emptyText: 'No hay usuarios registrados' }}
      />

      {/* ── Create/Edit Modal ── */}
      <Modal
        title={isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[
              { required: true, message: 'El nombre es requerido' },
              {
                pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                message: 'Solo letras y espacios',
              },
            ]}
          >
            <Input placeholder="Nombre completo" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'El email es requerido' },
              { type: 'email', message: 'Ingrese un email válido' },
            ]}
          >
            <Input placeholder="usuario@ejemplo.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label={isEdit ? 'Contraseña (dejar vacío para mantener)' : 'Contraseña'}
            rules={
              isEdit
                ? []
                : [
                    { required: true, message: 'La contraseña es requerida' },
                    { min: 6, message: 'Mínimo 6 caracteres' },
                  ]
            }
          >
            <Input.Password
              placeholder={
                isEdit
                  ? 'Dejar vacío para mantener actual'
                  : 'Mínimo 6 caracteres'
              }
            />
          </Form.Item>

          <Form.Item
            name="rol"
            label="Rol"
            rules={[{ required: true, message: 'Seleccione un rol' }]}
          >
            <Select placeholder="Seleccionar rol">
              <Option value="ADMINISTRADOR">Administrador</Option>
              <Option value="JEFE_PROYECTO">Jefe de Proyecto</Option>
              <Option value="USUARIO">Usuario</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
