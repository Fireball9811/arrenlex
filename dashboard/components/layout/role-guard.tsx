"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { UserRole } from "@/lib/auth/role"
import { useState } from "react"

const INQUILINO_FORBIDDEN = ["/usuarios", "/propiedades", "/dashboard"]
const INQUILINO_REDIRECT = "/nuevo"

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
        if (r === "inquilino" && INQUILINO_FORBIDDEN.some((p) => pathname.startsWith(p))) {
          router.replace(INQUILINO_REDIRECT)
        }
      })
      .catch(() => setRole("inquilino"))
  }, [pathname, router])

  return <>{children}</>
}
