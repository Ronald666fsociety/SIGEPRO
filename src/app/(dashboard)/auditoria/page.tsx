'use client'

import React from 'react'
import { Button, Space, Typography, message } from 'antd'
import { FilePdfOutlined } from '@ant-design/icons'
import AuditoriaTable from '@/components/AuditoriaTable'

const { Title, Text } = Typography

export default function AuditoriaPage() {
  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/exportar/pdf/auditoria', {
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
      a.download = 'reporte-auditoria.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.info('Exportación disponible próximamente')
    }
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
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Auditoría
          </Title>
          <Text type="secondary">
            Registro de operaciones realizadas en el sistema
          </Text>
        </div>
        <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>
          Reporte PDF
        </Button>
      </div>

      <AuditoriaTable />
    </div>
  )
}
