'use client'

import React from 'react'
import { Typography } from 'antd'
import ReportesView from '@/components/ReportesView'

const { Title, Text } = Typography

export default function ReportesPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Reportes
        </Title>
        <Text type="secondary">Indicadores y análisis de proyectos</Text>
      </div>

      <ReportesView />
    </div>
  )
}
