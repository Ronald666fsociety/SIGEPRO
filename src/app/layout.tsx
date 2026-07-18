import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import '@/styles/globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SIGEPRO — Sistema de Gestión de Proyectos',
  description: 'Sistema de Gestión de Proyectos SIGEPRO Enterprise',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={jakarta.className} style={{ margin: 0, padding: 0, background: '#f8fafc', color: '#0f172a' }}>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}
