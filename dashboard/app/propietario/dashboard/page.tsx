"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PropietarioDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: string } | null) => {
        if (data?.role === "admin") {
          router.replace("/admin/dashboard")
          return
        }
        if (data?.role === "inquilino") {
          router.replace("/inquilino/dashboard")
          return
        }
        setLoading(false)
      })
      .catch(() => router.replace("/login"))
  }, [router])

  if (loading) return <p className="text-muted-foreground">Cargando...</p>

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Panel de Propietario</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/propietario/propiedades">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle>Propiedades</CardTitle>
              <CardDescription>Gestionar mis propiedades</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/propietario/contratos">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle>Contratos</CardTitle>
              <CardDescription>Ver y crear contratos</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/propietario/invitaciones">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle>Invitaciones</CardTitle>
              <CardDescription>Invitar inquilinos</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/propietario/reportes/gestion-pagos">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle>Gestión de Pagos</CardTitle>
              <CardDescription>Ver pagos</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
