'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, Checkbox, Typography, Alert, message } from 'antd'
import {
  MailOutlined,
  LockOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  LockFilled,
  ThunderboltOutlined,
  CheckCircleOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { useAuth } from '@/context/AuthContext'

const { Title, Text } = Typography

interface LoginFormValues {
  email: string
  password: string
  remember?: boolean
}

export default function LoginForm() {
  const [form] = Form.useForm<LoginFormValues>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    setError(null)

    try {
      await login(values.email, values.password)
      message.success('Inicio de sesión exitoso')
      router.push('/')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err) {
        const apiErr = err as { status: number; error: string; code?: string }
        if (apiErr.status === 429) {
          setError('Demasiados intentos. Intente nuevamente en 15 minutos.')
        } else if (apiErr.status === 401) {
          setError('Credenciales inválidas')
        } else {
          setError(apiErr.error || 'Error al iniciar sesión')
        }
      } else {
        setError('Error de conexión. Verifique su servicio.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page-container">
      {/* Main Glassmorphic Card Container */}
      <div className="login-card-wrapper">
        {/* Left Column: Form Controls */}
        <div className="login-form-col">
          {/* Header Logo */}
          <div className="brand-header">
            <div className="brand-logo-icon">
              <ProjectOutlined style={{ fontSize: 24, color: '#60a5fa' }} />
            </div>
            <div>
              <Text className="brand-name">SIGEPRO</Text>
              <Text className="brand-subtext">Sistema de Gestión de Proyectos</Text>
            </div>
          </div>

          {/* Titles */}
          <div className="title-section">
            <Title level={2} className="main-heading">
              Bienvenido de nuevo
            </Title>
            <Text className="sub-heading">
              Inicia sesión en el Sistema de Gestión de Proyectos
            </Text>
          </div>

          {/* Error alert */}
          {error && (
            <Alert
              message="Error de Autenticación"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              className="dark-alert"
            />
          )}

          {/* Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
            initialValues={{ remember: true }}
          >
            <Form.Item
              name="email"
              label={<span className="field-label">Correo Electrónico</span>}
              rules={[
                { required: true, message: 'Ingrese su email' },
                { type: 'email', message: 'Ingrese un email válido' },
              ]}
            >
              <Input
                prefix={<MailOutlined className="input-icon" />}
                placeholder="Ingrese su correo electrónico"
                disabled={loading}
                className="dark-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="field-label">Contraseña</span>}
              rules={[{ required: true, message: 'Ingrese su contraseña' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="Ingrese su contraseña"
                disabled={loading}
                className="dark-input"
              />
            </Form.Item>

            <div className="remember-row">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="dark-checkbox">Recordarme</Checkbox>
              </Form.Item>
              <a href="#" onClick={(e) => e.preventDefault()} className="forgot-link">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              className="btn-signin"
            >
              Iniciar Sesión
            </Button>

            <div className="divider-row">
              <span className="divider-line"></span>
              <span className="divider-text">O</span>
              <span className="divider-line"></span>
            </div>

            <Button
              block
              size="large"
              className="btn-sso"
              onClick={() => {
                form.setFieldsValue({
                  email: 'admin@transandina.com',
                  password: '123456',
                })
              }}
            >
              <SafetyCertificateOutlined style={{ color: '#3b82f6' }} /> Acceso Demostración / SSO
            </Button>
          </Form>

          {/* Footer Security Badge */}
          <div className="security-badge">
            <SafetyCertificateOutlined className="security-badge-icon" />
            <div>
              <Text className="security-badge-title">Acceso seguro y encriptado</Text>
              <Text className="security-badge-desc">
                Tus datos están protegidos con seguridad de nivel empresarial
              </Text>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Tech Showcase */}
        <div className="login-showcase-col">
          {/* Central Glowing Shield Graphic */}
          <div className="shield-container">
            <div className="glowing-ring"></div>
            <div className="glowing-ring ring-2"></div>
            <div className="shield-card">
              <div className="shield-icon-wrapper">
                <BankOutlined style={{ fontSize: 48, color: '#60a5fa' }} />
              </div>
              <div className="shield-orbit"></div>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon cyan">
                <ThunderboltOutlined />
              </div>
              <Text className="metric-val">99.98%</Text>
              <Text className="metric-lbl">Uptime</Text>
            </div>

            <div className="metric-card">
              <div className="metric-icon blue">
                <LockFilled />
              </div>
              <Text className="metric-val">AES-256</Text>
              <Text className="metric-lbl">Encriptación</Text>
            </div>

            <div className="metric-card">
              <div className="metric-icon purple">
                <CheckCircleOutlined />
              </div>
              <Text className="metric-val">2FA</Text>
              <Text className="metric-lbl">Habilitado</Text>
            </div>
          </div>

          {/* Trust Statement */}
          <div className="trust-footer">
            <div className="trust-header">
              <BankOutlined style={{ color: '#93c5fd', fontSize: 16 }} />
              <Text className="trust-title">Confiable. Seguro. Eficiente.</Text>
            </div>
            <Text className="trust-desc">
              Plataforma de gestión de proyectos respaldada por infraestructura enterprise y altos estándares de seguridad.
            </Text>
          </div>
        </div>
      </div>

      {/* Page Copyright */}
      <div className="copyright-bar">
        <Text className="copyright-text">
          &copy; {new Date().getFullYear()} SIGEPRO — Plataforma Enterprise. Todos los derechos reservados.
        </Text>
      </div>

      {/* Styled JSX strictly isolated for Dark Tech UI */}
      <style jsx global>{`
        .login-page-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #020617;
          background-image:
            radial-gradient(circle at 15% 20%, rgba(37, 99, 235, 0.15), transparent 45%),
            radial-gradient(circle at 85% 80%, rgba(29, 78, 216, 0.12), transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.8), #020617);
          position: relative;
          padding: 24px;
          overflow-x: hidden;
        }

        /* Ambient background glow dots */
        .login-page-container::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          background-image: radial-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          opacity: 0.6;
        }

        .login-card-wrapper {
          display: flex;
          width: 100%;
          max-width: 980px;
          background: rgba(13, 22, 41, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 20px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(37, 99, 235, 0.12);
          overflow: hidden;
          z-index: 10;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .login-card-wrapper:hover {
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(37, 99, 235, 0.2);
        }

        /* Left Column */
        .login-form-col {
          flex: 1.1;
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
        }

        .brand-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .brand-logo-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(37, 99, 235, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(37, 99, 235, 0.25);
        }

        .brand-name {
          color: #ffffff !important;
          font-size: 18px !important;
          font-weight: 700 !important;
          display: block !important;
          line-height: 1.2 !important;
          letter-spacing: 0.5px;
        }

        .brand-subtext {
          color: #94a3b8 !important;
          font-size: 12px !important;
          display: block !important;
        }

        .title-section {
          margin-bottom: 24px;
        }

        .main-heading {
          color: #ffffff !important;
          font-size: 26px !important;
          font-weight: 700 !important;
          margin-bottom: 6px !important;
        }

        .sub-heading {
          color: #94a3b8 !important;
          font-size: 14px !important;
          display: block !important;
        }

        .field-label {
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 500;
        }

        .dark-input {
          background: rgba(15, 23, 42, 0.8) !important;
          border: 1px solid rgba(59, 130, 246, 0.2) !important;
          border-radius: 10px !important;
          color: #ffffff !important;
          height: 46px;
          transition: all 0.2s ease !important;
        }

        .dark-input:hover,
        .dark-input:focus,
        .ant-input-affix-wrapper-focused {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.25) !important;
        }

        .dark-input input {
          background: transparent !important;
          color: #ffffff !important;
        }

        .dark-input input::placeholder {
          color: #64748b !important;
        }

        .input-icon {
          color: #64748b;
          font-size: 16px;
          margin-right: 6px;
        }

        .remember-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
        }

        .dark-checkbox {
          color: #94a3b8 !important;
          font-size: 13px;
        }

        .dark-checkbox .ant-checkbox-inner {
          background-color: rgba(15, 23, 42, 0.8) !important;
          border-color: rgba(59, 130, 246, 0.3) !important;
          border-radius: 4px;
        }

        .dark-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #2563eb !important;
          border-color: #2563eb !important;
        }

        .forgot-link {
          color: #3b82f6;
          font-size: 13px;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .forgot-link:hover {
          color: #60a5fa;
          text-decoration: underline;
        }

        .btn-signin {
          height: 46px !important;
          border-radius: 10px !important;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
          border: none !important;
          font-weight: 600 !important;
          font-size: 15px !important;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4) !important;
          transition: all 0.25s ease !important;
        }

        .btn-signin:hover {
          box-shadow: 0 6px 22px rgba(37, 99, 235, 0.6) !important;
          transform: translateY(-1px);
        }

        .divider-row {
          display: flex;
          align-items: center;
          margin: 20px 0;
          gap: 12px;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .divider-text {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .btn-sso {
          height: 44px !important;
          border-radius: 10px !important;
          background: rgba(15, 23, 42, 0.6) !important;
          border: 1px solid rgba(59, 130, 246, 0.25) !important;
          color: #e2e8f0 !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }

        .btn-sso:hover {
          background: rgba(30, 41, 59, 0.8) !important;
          border-color: rgba(59, 130, 246, 0.4) !important;
          color: #ffffff !important;
        }

        .security-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .security-badge-icon {
          font-size: 20px;
          color: #3b82f6;
        }

        .security-badge-title {
          color: #e2e8f0 !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          display: block !important;
        }

        .security-badge-desc {
          color: #64748b !important;
          font-size: 11px !important;
          display: block !important;
        }

        .dark-alert {
          background: rgba(239, 68, 68, 0.1) !important;
          border: 1px solid rgba(239, 68, 68, 0.3) !important;
          border-radius: 8px !important;
          margin-bottom: 20px;
        }

        .dark-alert .ant-alert-message,
        .dark-alert .ant-alert-description {
          color: #fca5a5 !important;
        }

        /* Right Column (Showcase) */
        .login-showcase-col {
          flex: 1;
          background: rgba(10, 17, 32, 0.7);
          border-left: 1px solid rgba(59, 130, 246, 0.15);
          padding: 44px 36px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }

        .shield-container {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 10px;
        }

        .glowing-ring {
          position: absolute;
          width: 190px;
          height: 190px;
          border-radius: 50%;
          border: 1px dashed rgba(59, 130, 246, 0.3);
          animation: spin 30s linear infinite;
        }

        .ring-2 {
          width: 220px;
          height: 220px;
          border: 1px solid rgba(96, 165, 250, 0.15);
          animation: spin-reverse 25s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .shield-card {
          width: 140px;
          height: 160px;
          background: linear-gradient(145deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.8));
          border: 2px solid rgba(96, 165, 250, 0.5);
          clip-path: polygon(50% 0%, 100% 20%, 100% 75%, 50% 100%, 0% 75%, 0% 20%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 35px rgba(37, 99, 235, 0.4);
        }

        .shield-icon-wrapper {
          filter: drop-shadow(0 0 12px rgba(96, 165, 250, 0.8));
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          width: 100%;
          margin: 24px 0;
        }

        .metric-card {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px 8px;
          text-align: center;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .metric-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          margin: 0 auto 6px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .metric-icon.cyan {
          background: rgba(6, 182, 212, 0.15);
          color: #22d3ee;
        }

        .metric-icon.blue {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .metric-icon.purple {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
        }

        .metric-val {
          color: #ffffff !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          display: block !important;
          line-height: 1.2 !important;
        }

        .metric-lbl {
          color: #94a3b8 !important;
          font-size: 10px !important;
          display: block !important;
        }

        .trust-footer {
          text-align: center;
          padding: 14px;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          width: 100%;
        }

        .trust-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .trust-title {
          color: #ffffff !important;
          font-size: 12px !important;
          font-weight: 600 !important;
        }

        .trust-desc {
          color: #64748b !important;
          font-size: 11px !important;
          line-height: 1.4 !important;
          display: block !important;
        }

        .copyright-bar {
          margin-top: 24px;
          z-index: 10;
        }

        .copyright-text {
          color: #475569 !important;
          font-size: 12px !important;
        }

        @media (max-width: 868px) {
          .login-card-wrapper {
            flex-direction: column;
            max-width: 480px;
          }
          .login-showcase-col {
            display: none;
          }
          .login-form-col {
            padding: 32px 24px;
          }
        }
      `}</style>
    </div>
  )
}