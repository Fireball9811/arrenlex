"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import {
  isSpecialRole,
  getAllowedRouteForSpecialRole,
  getDashboardPathByRole,
} from "@/lib/auth/redirect-by-role"

const INQUILINO_FORBIDDEN = ["/usuarios", "/propiedades"]
const INQUILINO_ALLOWED = ["/inquilino", "/dashboard"]
const INQUILINO_REDIRECT = "/inquilino/dashboard"
const GENERIC_DASHBOARD = "/dashboard"

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading || !user) return

    const r = user.role

    if (isSpecialRole(r)) {
      const allowedRoute = getAllowedRouteForSpecialRole(r)
      if (!pathname.startsWith(allowedRoute)) {
        router.replace(allowedRoute)
      }
      return
    }

    if ((r === "admin" || r === "propietario") && pathname === GENERIC_DASHBOARD) {
      router.replace(getDashboardPathByRole(r))
      return
    }

    if (r === "inquilino") {
      if (INQUILINO_FORBIDDEN.some((p) => pathname.startsWith(p))) {
        if (!INQUILINO_ALLOWED.some((p) => pathname.startsWith(p))) {
          router.replace(INQUILINO_REDIRECT)
        }
      }
    }
  }, [pathname, router, user, isLoading])

  return <>{children}</>
}
