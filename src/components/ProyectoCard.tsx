'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, Tag, Button, Space, Typography, Popconfirm, Tooltip } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UserOutlined,
  DollarCircleOutlined,
  RightOutlined,
} from '@ant-design/icons'
import type { Proyecto } from '@/types'

const { Text, Title } = Typography

const ESTADO_COLORS: Record<string, string> = {
  PLANIFICADO: 'blue',
  EN_CURSO: 'green',
  FINALIZADO: 'default',
  CANCELADO: 'red',
}

const ESTADO_LABELS: Record<string, string> = {
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En Curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

interface ProyectoCardProps {
  proyecto: Proyecto
  onEdit: (proyecto: Proyecto) => void
  onDelete: (id: number) => void
  puedeEditar: boolean
}

export default function ProyectoCard({
  proyecto,
  onEdit,
  onDelete,
  puedeEditar,
}: ProyectoCardProps) {
  const router = useRouter()

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('es-AR')
  }

  const formatCurrency = (value: number) => {
    return 'Bs ' + value.toLocaleString('es-BO', { minimumFractionDigits: 2 })
  }

  const handleCardClick = () => {
    router.push(`/proyectos/${proyecto.id}`)
  }

  return (
    <Card
      hoverable
      onClick={handleCardClick}
      style={{
        height: '100%',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
      }}
      bodyStyle={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div>
        {/* Header: Name & Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
            {proyecto.nombre}
          </Title>
          <Tag color={ESTADO_COLORS[proyecto.estado] ?? 'default'} style={{ margin: 0 }}>
            {ESTADO_LABELS[proyecto.estado] ?? proyecto.estado}
          </Tag>
        </div>

        {proyecto.descripcion && (
          <Text
            type="secondary"
            ellipsis={{ tooltip: proyecto.descripcion }}
            style={{ fontSize: 13, marginBottom: 16, display: 'block', color: '#475569' }}
          >
            {proyecto.descripcion}
          </Text>
        )}

        {/* Info list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <Space size={8}>
            <CalendarOutlined style={{ color: '#2563eb' }} />
            <Text style={{ fontSize: 12, color: '#64748b' }}>
              {formatDate(proyecto.fechaInicio)} — {formatDate(proyecto.fechaFin)}
            </Text>
          </Space>

          <Space size={8}>
            <UserOutlined style={{ color: '#2563eb' }} />
            <Text style={{ fontSize: 12, color: '#64748b' }}>
              {proyecto.nombreJefeProyecto ?? 'Sin jefe asignado'}
            </Text>
          </Space>

          <Space size={8}>
            <DollarCircleOutlined style={{ color: '#2563eb' }} />
            <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
              {formatCurrency(proyecto.presupuestoTotal)}
            </Text>
          </Space>
        </div>
      </div>

      {/* Action bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 22,
          paddingTop: 14,
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <Space size={4}>
          {puedeEditar && (
            <>
              <Tooltip title="Editar proyecto">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ color: '#2563eb' }} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(proyecto)
                  }}
                />
              </Tooltip>
              <Popconfirm
                title="Eliminar proyecto"
                description="¿Está seguro de eliminar este proyecto?"
                onConfirm={(e) => {
                  e?.stopPropagation()
                  onDelete(proyecto.id)
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Sí, eliminar"
                cancelText="Cancelar"
              >
                <Tooltip title="Eliminar proyecto">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>

        <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: 700 }}>
          Ver detalle <RightOutlined style={{ fontSize: 10 }} />
        </Text>
      </div>
    </Card>
  )
}
