"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, FileText, Mail, BarChart3, Download } from "lucide-react"
import { useLang } from "@/lib/i18n/context"
import { IngresosGastosChart } from "@/components/charts/IngresosGastosChart"
import { ArrendatariosPorAnoChart } from "@/components/charts/ArrendatariosPorAnoChart"

interface DashboardData {
  propiedades: number
  contratos: number
  invitaciones: number
  pagosLastYear: number
  montoTotalLastYear: number
}

interface Propiedad {
  id: string
  direccion: string
  ciudad: string
  barrio: string
}

export default function PropietarioDashboardPage() {
  const router = useRouter()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])

  // Selectors state
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<string>("todas")
  const [aniosAtras, setAniosAtras] = useState<number>(1)
  const [vistaMensual, setVistaMensual] = useState<boolean>(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check auth and role
        const authRes = await fetch("/api/auth/me")
        if (!authRes.ok) {
          router.replace("/login")
          return
        }

        const authData: { role?: string } | null = await authRes.json()
        if (authData?.role === "admin") {
          router.replace("/admin/dashboard")
          return
        }
        if (authData?.role === "inquilino") {
          router.replace("/inquilino/dashboard")
          return
        }

        // Cargar datos del dashboard
        const [dashboardRes, propsRes] = await Promise.all([
          fetch("/api/propietario/dashboard"),
          fetch("/api/propiedades"),
        ])

        if (dashboardRes.ok) {
          const data: DashboardData = await dashboardRes.json()
          setDashboardData(data)
        }

        if (propsRes.ok) {
          const props: Propiedad[] = await propsRes.json()
          setPropiedades(props)
        }
      } catch (error) {
        console.error("Error loading dashboard:", error)
        router.replace("/login")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleExportar = async () => {
    try {
      const params = new URLSearchParams({
        anios: String(aniosAtras),
      })

      if (propiedadSeleccionada !== "todas") {
        params.append("propiedadId", propiedadSeleccionada)
      }

      const res = await fetch(`/api/propietario/exportar/datos?${params.toString()}`)
      if (!res.ok) throw new Error("Error al exportar")

      // Descargar archivo
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reporte_financiero_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting:", error)
      alert("Error al exportar los datos")
    }
  }

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

      {/* Análisis Financiero */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Análisis Financiero</CardTitle>
            <Button onClick={handleExportar} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar a Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Selectores */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">Propiedad</label>
              <Select value={propiedadSeleccionada} onValueChange={setPropiedadSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las propiedades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las propiedades</SelectItem>
                  {propiedades.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.direccion} - {prop.ciudad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1 block">Período</label>
              <Select value={String(aniosAtras)} onValueChange={(v) => setAniosAtras(parseInt(v, 10))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 año atrás</SelectItem>
                  <SelectItem value="2">2 años atrás</SelectItem>
                  <SelectItem value="3">3 años atrás</SelectItem>
                  <SelectItem value="5">5 años atrás</SelectItem>
                  <SelectItem value="10">10 años atrás</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <label className="text-sm text-muted-foreground mb-1 block">Vista</label>
              <Tabs value={vistaMensual ? "mensual" : "anual"} onValueChange={(v) => setVistaMensual(v === "mensual")}>
                <TabsList className="w-full">
                  <TabsTrigger value="mensual" className="flex-1">Mensual</TabsTrigger>
                  <TabsTrigger value="anual" className="flex-1">Anual</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Gráfica de Ingresos vs Gastos */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Ingresos vs Gastos</h3>
            <IngresosGastosChart
              propiedadId={propiedadSeleccionada === "todas" ? undefined : propiedadSeleccionada}
              aniosAtras={aniosAtras}
              vistaMensual={vistaMensual}
            />
          </div>

          {/* Gráfica de Arrendatarios por Año */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Arrendatarios por Año</h3>
            <ArrendatariosPorAnoChart
              propiedadId={propiedadSeleccionada === "todas" ? undefined : propiedadSeleccionada}
              aniosAtras={aniosAtras}
            />
          </div>
        </CardContent>
      </Card>

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
      </div>
    </div>
  )
}
