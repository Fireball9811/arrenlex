"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLang } from "@/lib/i18n/context"

export default function PropietarioDashboardPage() {
  const router = useRouter()
  const { t } = useLang()
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

  if (loading) return <p className="text-muted-foreground">{t.comun.cargando}</p>

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t.dashboard.propietario.titulo}</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/propietario/propiedades">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle>{t.dashboard.propietario.propiedades}</CardTitle>
              <CardDescription>{t.dashboard.propietario.gestionarPropiedades}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/propietario/contratos">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle>{t.dashboard.propietario.contratos}</CardTitle>
              <CardDescription>{t.dashboard.propietario.verCrearContratos}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/propietario/invitaciones">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle>{t.dashboard.propietario.invitaciones}</CardTitle>
              <CardDescription>{t.dashboard.propietario.invitarInquilinos}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/propietario/reportes/gestion-pagos">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle>{t.dashboard.propietario.gestionPagos}</CardTitle>
              <CardDescription>{t.dashboard.propietario.verPagos}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
