"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Home, Building2, DollarSign, MapPin } from "lucide-react"

type Counts = {
  disponibles: number
  arrendadas: number
  mantenimiento: number
  pendientes: number
  total: number
  tasaOcupacion: number
  promedioIngresos: number
}

type PropiedadConPropietario = {
  id: string
  direccion: string
  ciudad: string
  tipo: string
  valor_arriendo: number
  estado: string
  propietario: {
    id: string
    nombre: string | null
    email: string
  } | null
}

export default function AdminReportesPropiedadesPage() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"dashboard" | "inventario">("dashboard")
  const [filtro, setFiltro] = useState<"todos" | "disponibles" | "arrendadas" | "mantenimiento">("todos")

  useEffect(() => {
    fetch("/api/reportes/propiedades/counts")
      .then((r) => r.json())
      .then((data) => {
        setCounts(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching counts:", err)
        setLoading(false)
      })
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "disponible":
        return <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Disponible</span>
      case "arrendado":
        return <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">Arrendada</span>
      case "mantenimiento":
        return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Mantenimiento</span>
      case "pendiente":
        return <span className="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-800">Pendiente</span>
      default:
        return <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">{estado}</span>
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Reportes de Propiedades</h1>
        <p className="text-muted-foreground">Estado, ocupación e información de propiedades</p>
      </div>

      {vista === "dashboard" ? (
        <>
          {/* Dashboard de tarjetas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card
              className="bg-green-50 border-green-200 cursor-pointer hover:bg-green-100 transition"
              onClick={() => {
                setVista("inventario")
                setFiltro("disponibles")
              }}
            >
              <CardHeader>
                <CardTitle>✅ Disponibles</CardTitle>
                <CardDescription>Propiedades listas para arrendar</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? "..." : counts?.disponibles || 0}</p>
                <p className="text-sm text-muted-foreground">propiedades</p>
              </CardContent>
            </Card>

            <Card
              className="bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 transition"
              onClick={() => {
                setVista("inventario")
                setFiltro("arrendadas")
              }}
            >
              <CardHeader>
                <CardTitle>🔵 Arrendadas</CardTitle>
                <CardDescription>Propiedades con contrato activo</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? "..." : counts?.arrendadas || 0}</p>
                <p className="text-sm text-muted-foreground">propiedades</p>
              </CardContent>
            </Card>

            <Card
              className="bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100 transition"
              onClick={() => {
                setVista("inventario")
                setFiltro("mantenimiento")
              }}
            >
              <CardHeader>
                <CardTitle>🔧 En Mantenimiento</CardTitle>
                <CardDescription>Propiedades no disponibles temporalmente</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? "..." : counts?.mantenimiento || 0}</p>
                <p className="text-sm text-muted-foreground">propiedades</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📊 Tasa de Ocupación</CardTitle>
                <CardDescription>Porcentaje de propiedades arrendadas</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? "..." : counts?.tasaOcupacion || 0}%</p>
                <p className="text-sm text-muted-foreground">
                  de {counts?.total || 0} propiedades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>💰 Ingresos por Propiedad</CardTitle>
                <CardDescription>Promedio de ingreso mensual por inmueble</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? "..." : formatCurrency(counts?.promedioIngresos || 0)}</p>
                <p className="text-sm text-muted-foreground">promedio mensual</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:bg-gray-50 transition"
              onClick={() => {
                setVista("inventario")
                setFiltro("todos")
              }}
            >
              <CardHeader>
                <CardTitle>🏢 Inventario Completo</CardTitle>
                <CardDescription>Listado de todas las propiedades con detalles</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Ver inventario...</p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Vista de inventario */}
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button variant="outline" onClick={() => setVista("dashboard")}>
              ← Volver al Dashboard
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filtro === "todos" ? "default" : "outline"}
                onClick={() => setFiltro("todos")}
              >
                Todos ({counts?.total || 0})
              </Button>
              <Button
                variant={filtro === "disponibles" ? "default" : "outline"}
                onClick={() => setFiltro("disponibles")}
              >
                Disponibles ({counts?.disponibles || 0})
              </Button>
              <Button
                variant={filtro === "arrendadas" ? "default" : "outline"}
                onClick={() => setFiltro("arrendadas")}
              >
                Arrendadas ({counts?.arrendadas || 0})
              </Button>
              <Button
                variant={filtro === "mantenimiento" ? "default" : "outline"}
                onClick={() => setFiltro("mantenimiento")}
              >
                Mantenimiento ({counts?.mantenimiento || 0})
              </Button>
            </div>
          </div>

          {/* Tabla de propiedades */}
          <InventarioTable
            filtro={filtro}
            getEstadoBadge={getEstadoBadge}
            formatCurrency={formatCurrency}
          />
        </>
      )}
    </div>
  )
}

// Componente para la tabla de inventario
function InventarioTable({
  filtro,
  getEstadoBadge,
  formatCurrency,
}: {
  filtro: string
  getEstadoBadge: (estado: string) => React.ReactNode
  formatCurrency: (value: number) => string
}) {
  const [propiedades, setPropiedades] = useState<PropiedadConPropietario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reportes/propiedades/lista?filtro=${filtro}`)
      .then((r) => r.json())
      .then((data) => {
        setPropiedades(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching propiedades:", err)
        setLoading(false)
      })
  }, [filtro])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Cargando propiedades...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {filtro === "todos"
            ? "Todas las Propiedades"
            : filtro === "disponibles"
              ? "Propiedades Disponibles"
              : filtro === "arrendadas"
                ? "Propiedades Arrendadas"
                : "Propiedades en Mantenimiento"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {propiedades.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No se encontraron propiedades
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 text-left">Dirección</th>
                  <th className="p-3 text-left">Propietario</th>
                  <th className="p-3 text-left">Ciudad</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Valor</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Editar</th>
                </tr>
              </thead>
              <tbody>
                {propiedades.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{p.direccion}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {p.propietario ? (
                        <div>
                          <p className="font-medium">{p.propietario.nombre || "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground">{p.propietario.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin propietario</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {p.ciudad || "—"}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {p.tipo || "—"}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatCurrency(p.valor_arriendo)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">{getEstadoBadge(p.estado)}</td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (window.location.href = `/admin/propiedades/${p.id}`)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
