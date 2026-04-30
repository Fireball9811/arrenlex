"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, ChevronUp, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCalendarDateEs } from "@/lib/utils/calendar-date"

interface Recibo {
  id: string
  numero_recibo: number | null
  arrendador_nombre: string
  arrendador_cedula: string
  valor_arriendo: number
  fecha_recibo: string
  fecha_inicio_periodo: string | null
  fecha_fin_periodo: string | null
  tipo_pago: string | null
  estado: string | null
  referencia_pago: string | null
  propiedad: {
    id: string
    direccion: string
    ciudad: string
    barrio: string
  } | null
}

interface GrupoArrendatario {
  arrendador_nombre: string
  arrendador_cedula: string
  total: number
  recibos: Recibo[]
}

interface HistorialResponse {
  grupos: GrupoArrendatario[]
  total_general: number
  total_recibos: number
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0]
}

function getFirstDayOfMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

export default function HistorialPagosPage() {
  const [fechaInicio, setFechaInicio] = useState(getFirstDayOfMonthStr())
  const [fechaFin, setFechaFin] = useState(getTodayStr())
  const [datos, setDatos] = useState<HistorialResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const cargar = useCallback(async (inicio: string, fin: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/propietario/historial-recibos?fecha_inicio=${inicio}&fecha_fin=${fin}`
      )
      if (!res.ok) throw new Error("Error al cargar historial")
      const json: HistorialResponse = await res.json()
      setDatos(json)
      // Expandir todos los grupos por defecto
      setExpandidos(new Set(json.grupos.map((g) => `${g.arrendador_nombre}__${g.arrendador_cedula}`)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar(fechaInicio, fechaFin)
  }, []) // Solo al montar

  const handleFechaInicioChange = (val: string) => {
    setFechaInicio(val)
    if (val && fechaFin) cargar(val, fechaFin)
  }

  const handleFechaFinChange = (val: string) => {
    setFechaFin(val)
    if (fechaInicio && val) cargar(fechaInicio, val)
  }

  const toggleGrupo = (key: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div suppressHydrationWarning>
      {/* Encabezado */}
      <div className="mb-6">
        <Link
          href="/reportes/financiero"
          className="mb-2 flex items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Financiero
        </Link>
        <h1 className="text-3xl font-bold">Historial de Pagos</h1>
        <p className="text-muted-foreground">
          Recibos emitidos agrupados por arrendatario
        </p>
      </div>

      {/* Filtros de fecha */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Rango de fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Fecha inicio</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => handleFechaInicioChange(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Fecha fin</label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => handleFechaFinChange(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cargar(fechaInicio, fechaFin)}
                disabled={loading}
              >
                {loading ? "Cargando..." : "Actualizar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Resumen total */}
      {datos && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total recibido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-800">{formatCOP(datos.total_general)}</p>
              <p className="text-xs text-blue-600">{datos.total_recibos} recibos en el período</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Arrendatarios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{datos.grupos.length}</p>
              <p className="text-xs text-muted-foreground">con recibos en el período</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Período</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold">{formatCalendarDateEs(fechaInicio, "-")}</p>
              <p className="text-xs text-muted-foreground">al {formatCalendarDateEs(fechaFin, "-")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sin datos */}
      {datos && datos.grupos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay recibos en el período seleccionado.</p>
          </CardContent>
        </Card>
      )}

      {/* Grupos por arrendatario */}
      {datos && datos.grupos.length > 0 && (
        <div className="space-y-4">
          {datos.grupos.map((grupo) => {
            const key = `${grupo.arrendador_nombre}__${grupo.arrendador_cedula}`
            const abierto = expandidos.has(key)
            return (
              <Card key={key} className="overflow-hidden">
                {/* Cabecera del grupo */}
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-muted/40"
                  onClick={() => toggleGrupo(key)}
                >
                  <div>
                    <p className="font-semibold text-lg">{grupo.arrendador_nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      CC {grupo.arrendador_cedula || "—"} &middot; {grupo.recibos.length} recibo{grupo.recibos.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-bold text-green-700">{formatCOP(grupo.total)}</p>
                    </div>
                    {abierto ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Tabla de recibos */}
                {abierto && (
                  <div className="border-t">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground"># Recibo</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Propiedad</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Período</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.recibos.map((recibo, idx) => (
                            <tr
                              key={recibo.id}
                              className={idx % 2 === 0 ? "bg-white" : "bg-muted/20"}
                            >
                              <td className="px-4 py-2 font-mono text-xs">
                                {recibo.numero_recibo ?? "—"}
                              </td>
                              <td className="px-4 py-2">{formatCalendarDateEs(recibo.fecha_recibo, "-")}</td>
                              <td className="px-4 py-2">
                                {recibo.propiedad
                                  ? `${recibo.propiedad.direccion}${recibo.propiedad.ciudad ? `, ${recibo.propiedad.ciudad}` : ""}`
                                  : "—"}
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">
                                {formatCalendarDateEs(recibo.fecha_inicio_periodo, "-")} – {formatCalendarDateEs(recibo.fecha_fin_periodo, "-")}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold text-green-700">
                                {formatCOP(recibo.valor_arriendo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t bg-muted/40">
                            <td colSpan={4} className="px-4 py-2 text-right font-semibold">
                              Subtotal {grupo.arrendador_nombre}
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-green-800">
                              {formatCOP(grupo.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}

          {/* Total general */}
          <Card className="border-2 border-blue-300 bg-blue-50">
            <CardContent className="flex items-center justify-between py-4">
              <p className="text-lg font-bold text-blue-800">Total general del período</p>
              <p className="text-2xl font-bold text-blue-900">{formatCOP(datos.total_general)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
