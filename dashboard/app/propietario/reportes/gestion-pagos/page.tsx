"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, DollarSign, Calendar, Check, Clock, X } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

interface Pago {
  id: string
  monto: number
  fecha_pago: string
  periodo: string
  estado: "aprobado" | "pendiente" | "rechazado"
  referencia_bancaria?: string
  propiedad_id: string
  contrato_id: string
  contratos?: {
    id: string
    inquilino_id: string
    inquilinos?: {
      id: string
      nombre: string
      email: string
    }
  }
  propiedad?: {
    titulo: string
    direccion: string
  }
}

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "aprobado":
      return (
        <div className="flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
          <Check className="h-3 w-3" />
          Aprobado
        </div>
      )
    case "pendiente":
      return (
        <div className="flex items-center gap-1 rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
          <Clock className="h-3 w-3" />
          Pendiente
        </div>
      )
    case "rechazado":
      return (
        <div className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
          <X className="h-3 w-3" />
          Rechazado
        </div>
      )
    default:
      return (
        <div className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
          {estado}
        </div>
      )
  }
}

export default function PropietarioGestionPagosPage() {
  const router = useRouter()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [filtroEstado, setFiltroEstado] = useState<"" | "aprobado" | "pendiente" | "rechazado">("")
  const [filtroPropiedad, setFiltroPropiedad] = useState("")
  const [propiedades, setPropiedades] = useState<{ id: string; titulo: string }[]>([])

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
        
        return fetch("/api/propietario/pagos-ultimo-ano")
          .then((res) => res.ok ? res.json() : [])
          .then((data: Pago[]) => {
            setPagos(data)
            const uniqueProps = [
              ...new Map(
                data.map((p) => [
                  p.propiedad_id,
                  { id: p.propiedad_id, titulo: p.propiedad?.titulo || "Sin título" },
                ])
              ).values(),
            ].sort((a, b) => a.titulo.localeCompare(b.titulo))
            setPropiedades(uniqueProps)
            setLoading(false)
          })
      })
      .catch(() => {
        setLoading(false)
      })
  }, [router])

  const pagosFiltrados = pagos.filter((p) => {
    const matchEstado = !filtroEstado || p.estado === filtroEstado
    const matchPropiedad = !filtroPropiedad || p.propiedad_id === filtroPropiedad
    return matchEstado && matchPropiedad
  })

  const totalPagos = pagosFiltrados.reduce((sum, p) => sum + p.monto, 0)
  const pagosAprobados = pagosFiltrados
    .filter((p) => p.estado === "aprobado")
    .reduce((sum, p) => sum + p.monto, 0)
  const pagosPendientes = pagosFiltrados
    .filter((p) => p.estado === "pendiente")
    .reduce((sum, p) => sum + p.monto, 0)

  if (loading) return <p className="text-muted-foreground">{t.comun.cargando}</p>

  return (
    <div suppressHydrationWarning>
      <div className="mb-6">
        <Link href="/propietario/reportes" className="mb-2 flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Volver a Reportes
        </Link>
        <h1 className="text-3xl font-bold">Gestión de Pagos</h1>
        <p className="text-muted-foreground">Últimos 12 meses</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              }).format(totalPagos)}
            </div>
            <p className="text-xs text-muted-foreground">{pagosFiltrados.length} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              }).format(pagosAprobados)}
            </div>
            <p className="text-xs text-muted-foreground">confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              }).format(pagosPendientes)}
            </div>
            <p className="text-xs text-muted-foreground">en espera</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Todos los estados</option>
              <option value="aprobado">Aprobado</option>
              <option value="pendiente">Pendiente</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Propiedad</label>
            <select
              value={filtroPropiedad}
              onChange={(e) => setFiltroPropiedad(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Todas las propiedades</option>
              {propiedades.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.titulo}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de pagos */}
      {pagosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay pagos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            Resultados: {pagosFiltrados.length} de {pagos.length} pagos
          </div>
          <div className="space-y-3">
            {pagosFiltrados.map((pago) => (
              <Card key={pago.id}>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha</p>
                      <p className="font-semibold">
                        {pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString("es-CO") : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Período</p>
                      <p className="font-semibold">{pago.periodo || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Propiedad</p>
                      <p className="font-semibold text-sm">{pago.propiedad?.titulo || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Inquilino</p>
                      <p className="font-semibold text-sm">
                        {pago.contratos?.inquilinos?.nombre || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Monto</p>
                      <p className="font-bold text-green-600 text-lg">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        }).format(pago.monto || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Estado:</span>
                      {getEstadoBadge(pago.estado)}
                    </div>
                    {pago.referencia_bancaria && (
                      <p className="text-xs text-muted-foreground">
                        Ref: {pago.referencia_bancaria}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
