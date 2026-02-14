"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Redirección centralizada por rol.
 * /dashboard → /admin/dashboard | /propietario/dashboard | /inquilino/dashboard
 */
export default function DashboardRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    fetch("/api/auth/dashboard")
      .then((res) => res.json())
      .then((data: { redirect?: string }) => {
        router.replace(data.redirect || "/login")
      })
      .catch(() => router.replace("/login"))
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
