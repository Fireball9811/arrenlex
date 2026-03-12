"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, FileText, Mail, BarChart3 } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

interface DashboardData {
  propiedades: number
  contratos: number
  invitaciones: number
  pagosLastYear: number
  montoTotalLastYear: number
}

export default function PropietarioDashboardPage() {
  const router = useRouter()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

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
        
        // Cargar datos del dashboard
        return fetch("/api/propietario/dashboard")
          .then((res) => res.ok ? res.json() : null)
          .then((data: DashboardData | null) => {
            setDashboardData(data)
            setLoading(false)
          })
      })
      .catch(() => router.replace("/login"))
  }, [router])

  if (loading) return <p className="text-muted-foreground">{t.comun.cargando}</p>

  const stats = dashboardData || { propiedades: 0, contratos: 0, invitaciones: 0, pagosLastYear: 0, montoTotalLastYear: 0 }

  return (
    <div suppressHydrationWarning>
      <h1 className="mb-6 text-3xl font-bold">{t.dashboard.propietario.titulo}</h1>
      
      {/* Tarjetas de estadísticas */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propiedades</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.propiedades}</div>
            <p className="text-xs text-muted-foreground">registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contratos}</div>
            <p className="text-xs text-muted-foreground">activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invitaciones</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.invitaciones}</div>
            <p className="text-xs text-muted-foreground">enviadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos (1 año)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pagosLastYear}</div>
            <p className="text-xs text-muted-foreground">recibidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              }).format(stats.montoTotalLastYear)}
            </div>
            <p className="text-xs text-muted-foreground">último año</p>
          </CardContent>
        </Card>
      </div>

      {/* Tarjetas de acceso rápido */}
      <h2 className="mb-4 text-xl font-bold">Acceso rápido</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/propietario/propiedades">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                {t.dashboard.propietario.propiedades}
              </CardTitle>
              <CardDescription>{t.dashboard.propietario.gestionarPropiedades}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        
        <Link href="/propietario/contratos">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t.dashboard.propietario.contratos}
              </CardTitle>
              <CardDescription>{t.dashboard.propietario.verCrearContratos}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        
        <Link href="/propietario/invitaciones">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t.dashboard.propietario.invitaciones}
              </CardTitle>
              <CardDescription>{t.dashboard.propietario.invitarInquilinos}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        
        <Link href="/propietario/reportes/gestion-pagos">
          <Card className="h-full transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t.dashboard.propietario.gestionPagos}
              </CardTitle>
              <CardDescription>{t.dashboard.propietario.verPagos}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
