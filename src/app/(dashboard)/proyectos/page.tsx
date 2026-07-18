'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Row,
  Col,
  Button,
  Space,
  Typography,
  Spin,
  Alert,
  message,
} from 'antd'
import { PlusOutlined, FilePdfOutlined } from '@ant-design/icons'
import ProyectoCard from '@/components/ProyectoCard'
import ProyectoModal from '@/components/ProyectoModal'
import { useAuth } from '@/context/AuthContext'
import type { Proyecto, Usuario } from '@/types'

const { Title } = Typography

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProyecto, setEditProyecto] = useState<Proyecto | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { user, hasRole } = useAuth()

  const puedeEditar = hasRole(['ADMINISTRADOR', 'JEFE_PROYECTO'])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')

      const [proyRes, usuRes] = await Promise.all([
        fetch('/api/proyectos', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/usuarios', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!proyRes.ok) throw new Error('Error al cargar proyectos')
      if (!usuRes.ok) throw new Error('Error al cargar usuarios')

      setProyectos(await proyRes.json())
      setUsuarios(await usuRes.json())
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error desconocido'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreate = async (values: any) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/proyectos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear proyecto')
      }

      message.success('Proyecto creado correctamente')
      setModalOpen(false)
      setEditProyecto(null)
      fetchData()
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (proyecto: Proyecto) => {
    setEditProyecto(proyecto)
    setModalOpen(true)
  }

  const handleUpdate = async (values: any) => {
    if (!editProyecto) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/proyectos/${editProyecto.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar proyecto')
      }

      message.success('Proyecto actualizado correctamente')
      setModalOpen(false)
      setEditProyecto(null)
      fetchData()
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
      const res = await fetch(`/api/proyectos/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar proyecto')
      }

      message.success('Proyecto eliminado correctamente')
      fetchData()
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(err.message)
      }
    }
  }

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/exportar/pdf/proyectos', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 404) {
        message.info('Exportación disponible próximamente')
        return
      }

      if (!res.ok) throw new Error('Error al exportar')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'reporte-proyectos.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.info('Exportación disponible próximamente')
    }
  }

  // ── States ──

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert title="Error" description={error} type="error" showIcon />
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Proyectos
        </Title>
        <Space>
          <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>
            Reporte PDF
          </Button>
          {puedeEditar && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditProyecto(null)
                setModalOpen(true)
              }}
            >
              Nuevo Proyecto
            </Button>
          )}
        </Space>
      </div>

      {proyectos.length === 0 ? (
        <Alert
          title="No hay proyectos registrados"
          type="info"
          showIcon
        />
      ) : (
        <Row gutter={[16, 16]}>
          {proyectos.map((proyecto) => (
            <Col key={proyecto.id} xs={24} sm={12} lg={8}>
              <ProyectoCard
                proyecto={proyecto}
                onEdit={handleEdit}
                onDelete={handleDelete}
                puedeEditar={puedeEditar}
              />
            </Col>
          ))}
        </Row>
      )}

      <ProyectoModal
        open={modalOpen}
        proyecto={editProyecto}
        usuarios={usuarios}
        onCancel={() => {
          setModalOpen(false)
          setEditProyecto(null)
        }}
        onSubmit={editProyecto ? handleUpdate : handleCreate}
        loading={submitting}
      />
    </div>
  )
}
