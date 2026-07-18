'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button, Space, Typography, Spin, Alert, message } from 'antd'
import { PlusOutlined, FilePdfOutlined } from '@ant-design/icons'
import UsuarioTable from '@/components/UsuarioTable'
import type { Usuario } from '@/types'

const { Title } = Typography

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/usuarios', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (!res.ok) throw new Error('Error al cargar usuarios')

      setUsuarios(await res.json())
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error desconocido'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/exportar/pdf/usuarios', {
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
      a.download = 'reporte-usuarios.pdf'
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
    return <Alert title="Error" description={error} type="error" showIcon />
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
          Usuarios
        </Title>
        <Space>
          <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>
            Reporte PDF
          </Button>
        </Space>
      </div>

      <UsuarioTable
        usuarios={usuarios}
        onUsuarioChange={fetchUsuarios}
      />
    </div>
  )
}
