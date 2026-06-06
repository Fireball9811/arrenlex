"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import type { UserRole } from "@/lib/auth/role"
import { getDashboardPathByRole } from "@/lib/auth/redirect-by-role"

export function useRequireRole(allowedRoles: UserRole[]) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const rolesKey = allowedRoles.join(",")

  const isAuthorized =
    !isLoading && user !== null && allowedRoles.includes(user.role)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/login")
      return
    }
    const roles = rolesKey.split(",") as UserRole[]
    if (!roles.includes(user.role)) {
      router.replace(getDashboardPathByRole(user.role))
    }
  }, [user, isLoading, router, rolesKey])

  return { user, isLoading, isAuthorized }
}
