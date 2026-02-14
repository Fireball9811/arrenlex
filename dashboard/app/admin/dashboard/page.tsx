"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: string } | null) => {
        if (data?.role !== "admin") {
          const redirect = data?.role === "propietario" ? "/propietario/dashboard" : "/inquilino/dashboard"
          router.replace(redirect)
          return
        }
        setLoading(false)
      })
      .catch(() => router.replace("/login"))
  }, [router])

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Panel de Administración</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Usuarios</h2>
          <p className="mt-2 text-2xl font-bold">—</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Contratos Activos</h2>
          <p className="mt-2 text-2xl font-bold">—</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Ingresos</h2>
          <p className="mt-2 text-2xl font-bold">—</p>
        </div>
      </div>
    </div>
  )
}
