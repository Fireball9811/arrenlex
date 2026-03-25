"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { UserRole } from "@/lib/auth/role"
import {
  isSpecialRole,
  getAllowedRouteForSpecialRole,
  getDashboardPathByRole,
} from "@/lib/auth/redirect-by-role"

const ROLE_CACHE_KEY = "arrenlex_user_role"

// Rutas que los inquilinos NO pueden acceder
const INQUILINO_FORBIDDEN = ["/usuarios", "/propiedades"]
const INQUILINO_ALLOWED = ["/inquilino", "/dashboard"]
const INQUILINO_REDIRECT = "/inquilino/dashboard"

// Ruta genérica del dashboard que debe redirigir al dashboard del rol
const GENERIC_DASHBOARD = "/dashboard"

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<UserRole | null>(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem(ROLE_CACHE_KEY) as UserRole) ?? null
    }
    return null
  })

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: UserRole } | null) => {
        const r: UserRole = data?.role ?? "inquilino"
        setRole(r)
        sessionStorage.setItem(ROLE_CACHE_KEY, r)

        // Redirección para roles especiales
        if (isSpecialRole(r)) {
          const allowedRoute = getAllowedRouteForSpecialRole(r)
          if (!pathname.startsWith(allowedRoute)) {
            router.replace(allowedRoute)
          }
          return
        }

        // Admin y propietario en /dashboard genérico → redirigir a su dashboard
        if ((r === "admin" || r === "propietario") && pathname === GENERIC_DASHBOARD) {
          router.replace(getDashboardPathByRole(r))
          return
        }

        // Lógica para inquilinos
        if (r === "inquilino") {
          if (INQUILINO_FORBIDDEN.some((p) => pathname.startsWith(p))) {
            if (!INQUILINO_ALLOWED.some((p) => pathname.startsWith(p))) {
              router.replace(INQUILINO_REDIRECT)
            }
          }
        }
      })
      .catch(() => {
        setRole("inquilino")
        sessionStorage.setItem(ROLE_CACHE_KEY, "inquilino")
      })
  }, [pathname, router])

  return <>{children}</>
}
