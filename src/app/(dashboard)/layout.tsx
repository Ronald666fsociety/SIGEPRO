'use client'

import React, { useState } from 'react'
import { Layout, Menu, Button, Typography, Dropdown, Avatar, Spin } from 'antd'
import {
  DashboardOutlined,
  ProjectOutlined,
  TeamOutlined,
  BarChartOutlined,
  AuditOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { usePathname, useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/context/AuthContext'

const { Header, Sider, Content } = Layout
const { Text } = Typography

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <Spin size="large" />
      </div>
    )
  }

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined style={{ fontSize: 16 }} />,
      label: 'Dashboard',
    },
    {
      key: '/proyectos',
      icon: <ProjectOutlined style={{ fontSize: 16 }} />,
      label: 'Proyectos',
    },
    {
      key: '/usuarios',
      icon: <TeamOutlined style={{ fontSize: 16 }} />,
      label: 'Usuarios',
      style: user?.rol === 'ADMINISTRADOR' ? {} : { display: 'none' },
    },
    {
      key: '/reportes',
      icon: <BarChartOutlined style={{ fontSize: 16 }} />,
      label: 'Reportes',
    },
    {
      key: '/auditoria',
      icon: <AuditOutlined style={{ fontSize: 16 }} />,
      label: 'Auditoría',
      style: user?.rol === 'ADMINISTRADOR' ? {} : { display: 'none' },
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key)
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `${user?.nombre} (${user?.rol})`,
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesión',
      danger: true,
      onClick: logout,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sleek Slate Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          borderRight: '1px solid #1e293b',
          zIndex: 100,
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Brand Logo Header */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            gap: 12,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0, 0, 0, 0.15)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            }}
          >
            <ProjectOutlined style={{ color: '#ffffff', fontSize: 18 }} />
          </div>
          {!collapsed && (
            <div>
              <Text strong style={{ color: '#ffffff', fontSize: 16, letterSpacing: 1, fontWeight: 800, display: 'block', lineHeight: 1.2 }}>
                SIGEPRO
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 10, display: 'block' }}>
                Enterprise Platform
              </Text>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            borderRight: 'none',
            paddingTop: 16,
          }}
        />
      </Sider>

      {/* Main Content Area */}
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.25s ease', background: '#f8fafc' }}>
        {/* Top Header */}
        <Header
          style={{
            padding: '0 28px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.03)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: 64,
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined style={{ color: '#334155' }} /> : <MenuFoldOutlined style={{ color: '#334155' }} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', border: '1px solid #dbeafe' }}>
              <SafetyCertificateOutlined style={{ color: '#2563eb', fontSize: 13 }} />
              <Text style={{ color: '#1e40af', fontSize: 11, fontWeight: 600 }}>Plataforma Segura Enterprise</Text>
            </div>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2563eb' }} />
                <Text strong style={{ color: '#0f172a', fontSize: 13 }}>{user?.nombre}</Text>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: '24px 28px', minHeight: 'calc(100vh - 112px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  )
}
