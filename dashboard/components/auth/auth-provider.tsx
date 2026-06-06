"use client"

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react"
import type { UserRole } from "@/lib/auth/role"
import { ROLE_CACHE_KEY } from "@/lib/auth/sign-out-client"

export type AuthUser = {
  id: string
  email: string | null
  role: UserRole
  nombre: string
  cedula: string
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null
  children: ReactNode
}) {
  useEffect(() => {
    if (initialUser?.role) {
      sessionStorage.setItem(ROLE_CACHE_KEY, initialUser.role)
    }
  }, [initialUser])

  return (
    <AuthContext.Provider value={{ user: initialUser, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }
  return ctx
}
