"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Users, FileText, MessageSquare, Wrench, Building, TrendingUp } from "lucide-react"
import { MetricPieChart } from "@/components/admin/pie-chart"

interface DashboardMetrics {
  usuarios: {
    activos: number
    inactivos: number
    bloqueados: number
    totales: number
    rolesActivos: {
      admin: number
      propietario: number
      inquilino: number
      maintenance_special: number
      insurance_special: number
      lawyer_special: number
    }
  }
  contratos: { cumplidos: number; pendientes: number; enEjecucion: number }
  mensajes: { contestados: number; pendientes: number; enCurso: number }
  mantenimientos: { pendientes: number; enEjecucion: number; completados: number }
  propiedades: { arrendadas: number; pendientes: number; disponibles: number }
  movimientoRentas: {
    totalContratos: number
    propiedadesRentadas: number
    promedioVecesRentada: number
    promedioDuracionMeses: number
  }
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)

  useEffect(() => {
    // Verificar rol
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

    // Cargar métricas
    fetch("/api/admin/dashboard/metrics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMetrics(data))
      .catch(() => {})
  }, [router])

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Panel de Administración</h1>

      {/* Tarjetas de métricas con gráficas - Grid de 3 columnas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
        {/* Usuarios */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {metrics && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {/* Gráfico de Estados */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1 text-center">Estados</h4>
                    <MetricPieChart
                      data={[
                        { name: 'Activos', value: metrics.usuarios.activos, color: '#10b981' },
                        { name: 'Inactivos', value: metrics.usuarios.inactivos, color: '#f59e0b' },
                        { name: 'Bloqueados', value: metrics.usuarios.bloqueados, color: '#ef4444' }
                      ]}
                    />
                  </div>
                  {/* Gráfico de Roles */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1 text-center">Roles (Activos)</h4>
                    <MetricPieChart
                      data={[
                        { name: 'Admin', value: metrics.usuarios.rolesActivos.admin, color: '#a855f7' },
                        { name: 'Propietarios', value: metrics.usuarios.rolesActivos.propietario, color: '#3b82f6' },
                        { name: 'Inquilinos', value: metrics.usuarios.rolesActivos.inquilino, color: '#10b981' },
                        { name: 'Mantenimiento', value: metrics.usuarios.rolesActivos.maintenance_special, color: '#f97316' },
                        { name: 'Seguros', value: metrics.usuarios.rolesActivos.insurance_special, color: '#06b6d4' },
                        { name: 'Legal', value: metrics.usuarios.rolesActivos.lawyer_special, color: '#6366f1' },
                      ]}
                    />
                  </div>
                </div>
                <p className="text-center text-sm font-bold">Total: {metrics.usuarios.totales}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/admin/usuarios")}
                  >
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push("/admin/usuarios?create=true")}
                  >
                    <UserPlus className="mr-1 h-3 w-3" />
                    Crear
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contratos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contratos</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {metrics && (
              <>
                <MetricPieChart
                  data={[
                    { name: 'Cumplidos', value: metrics.contratos.cumplidos, color: '#10b981' },
                    { name: 'Pendientes', value: metrics.contratos.pendientes, color: '#f59e0b' },
                    { name: 'Ejecución', value: metrics.contratos.enEjecucion, color: '#3b82f6' }
                  ]}
                />
                <p className="mt-2 text-center text-lg font-bold">Total: {metrics.contratos.cumplidos + metrics.contratos.pendientes + metrics.contratos.enEjecucion}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mensajes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mensajes</CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {metrics && (
              <>
                <MetricPieChart
                  data={[
                    { name: 'Contestados', value: metrics.mensajes.contestados, color: '#10b981' },
                    { name: 'Pendientes', value: metrics.mensajes.pendientes, color: '#f59e0b' },
                    { name: 'En curso', value: metrics.mensajes.enCurso, color: '#3b82f6' }
                  ]}
                />
                <p className="mt-2 text-center text-lg font-bold">Total: {metrics.mensajes.contestados + metrics.mensajes.pendientes + metrics.mensajes.enCurso}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mantenimientos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mantenimientos</CardTitle>
            <Wrench className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {metrics && (
              <>
                <MetricPieChart
                  data={[
                    { name: 'Pendientes', value: metrics.mantenimientos.pendientes, color: '#f59e0b' },
                    { name: 'Ejecución', value: metrics.mantenimientos.enEjecucion, color: '#3b82f6' },
                    { name: 'Completados', value: metrics.mantenimientos.completados, color: '#10b981' }
                  ]}
                />
                <p className="mt-2 text-center text-lg font-bold">Total: {metrics.mantenimientos.pendientes + metrics.mantenimientos.enEjecucion + metrics.mantenimientos.completados}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Propiedades */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Propiedades</CardTitle>
            <Building className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {metrics && (
              <>
                <MetricPieChart
                  data={[
                    { name: 'Arrendadas', value: metrics.propiedades.arrendadas, color: '#10b981' },
                    { name: 'Pendientes', value: metrics.propiedades.pendientes, color: '#f59e0b' },
                    { name: 'Disponibles', value: metrics.propiedades.disponibles, color: '#3b82f6' }
                  ]}
                />
                <p className="mt-2 text-center text-lg font-bold">Total: {metrics.propiedades.arrendadas + metrics.propiedades.pendientes + metrics.propiedades.disponibles}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Movimiento de Rentas - NUEVA TARJETA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Movimiento de Rentas</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {metrics && (
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-gray-600">Propiedades Rentadas</span>
                  <span className="font-semibold">{metrics.movimientoRentas.propiedadesRentadas}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-gray-600">Promedio Veces Rentada</span>
                  <span className="font-semibold">{metrics.movimientoRentas.promedioVecesRentada}x</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-gray-600">Duración Promedio</span>
                  <span className="font-semibold">{metrics.movimientoRentas.promedioDuracionMeses} meses</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm text-gray-600">Total Contratos</span>
                  <span className="font-bold text-lg">{metrics.movimientoRentas.totalContratos}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas - Parte inferior con más espaciado */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="default"
              className="h-20 flex-col gap-2"
              onClick={() => router.push("/admin/usuarios?create=true")}
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-sm">Nuevo Usuario</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => router.push("/admin/usuarios")}
            >
              <Users className="h-5 w-5" />
              <span className="text-sm">Gestionar Usuarios</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => router.push("/mantenimiento")}
            >
              <Wrench className="h-5 w-5" />
              <span className="text-sm">Mantenimiento</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => router.push("/mensajes")}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm">Mensajes</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
