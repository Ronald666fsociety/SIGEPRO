'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { RolUsuario } from '@/types'
import { api } from '@/services/api'

interface AuthUser {
  id: number
  nombre: string
  email: string
  rol: RolUsuario
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  hasRole: (roles: RolUsuario[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ── Restore session from localStorage on mount ──
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('auth_user')

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{
      token: string
      usuario: AuthUser
    }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    localStorage.setItem('auth_token', res.token)
    localStorage.setItem('auth_user', JSON.stringify(res.usuario))
    setToken(res.token)
    setUser(res.usuario)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  const hasRole = useCallback(
    (roles: RolUsuario[]) => {
      if (!user) return false
      return roles.includes(user.rol)
    },
    [user]
  )

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
