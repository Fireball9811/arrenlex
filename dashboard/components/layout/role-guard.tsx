"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { UserRole } from "@/lib/auth/role"
import { isSpecialRole, getAllowedRouteForSpecialRole } from "@/lib/auth/redirect-by-role"
import { useState } from "react"

// Rutas que los inquilinos NO pueden acceder
const INQUILINO_FORBIDDEN = ["/usuarios", "/propiedades"]
// Rutas permitidas para inquilinos: /inquilino/* y /dashboard (redirección central)
const INQUILINO_ALLOWED = ["/inquilino", "/dashboard"]
const INQUILINO_REDIRECT = "/inquilino/dashboard"

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: UserRole } | null) => {
        const r = data?.role ?? "inquilino"
        setRole(r)

        // Redirección para roles especiales
        if (isSpecialRole(r)) {
          const allowedRoute = getAllowedRouteForSpecialRole(r)
          if (!pathname.startsWith(allowedRoute)) {
            router.replace(allowedRoute)
          }
          return
        }

        // Lógica existente para inquilinos
        if (r === "inquilino") {
          if (INQUILINO_FORBIDDEN.some((p) => pathname.startsWith(p))) {
            if (!INQUILINO_ALLOWED.some((p) => pathname.startsWith(p))) {
              router.replace(INQUILINO_REDIRECT)
            }
          }
        }
      })
      .catch(() => setRole("inquilino"))
  }, [pathname, router])

  return <>{children}</>
}
