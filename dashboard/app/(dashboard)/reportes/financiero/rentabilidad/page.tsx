"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLang } from "@/lib/i18n/context"

type PropiedadRentabilidad = {
  propiedad_id: string
  direccion: string
  ciudad: string
  estado: string
  valor_arriendo_mensual: number
  ingresos: number
  gastos: number
  neto: number
}

type RentabilidadResponse = {
  propiedades: PropiedadRentabilidad[]
  consolidado: { ingresos: number; gastos: number; neto: number }
  fecha_inicio: string
  fecha_fin: string
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(s: string) {
  if (!s) return "—"
  const [y, m, d] = s.split("T")[0].split("-")
  return `${d}/${m}/${y}`
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0]
}

function getFirstDayOfYearStr() {
  return `${new Date().getFullYear()}-01-01`
}

function pct(gastos: number, ingresos: number): number | null {
  if (ingresos === 0) return null
  return Math.round((gastos / ingresos) * 100)
}

const ESTADO_BADGE: Record<string, string> = {
  disponible: "bg-green-100 text-green-700 border-green-200",
  arrendado: "bg-blue-100 text-blue-700 border-blue-200",
  mantenimiento: "bg-amber-100 text-amber-700 border-amber-200",
}

export default function RentabilidadPage() {
  const { t } = useLang()
  const r = t.mantenimiento.rentabilidad

  const [fechaInicio, setFechaInicio] = useState(getFirstDayOfYearStr())
  const [fechaFin, setFechaFin] = useState(getTodayStr())
  const [datos, setDatos] = useState<RentabilidadResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async (inicio: string, fin: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/reportes/rentabilidad-propiedades?fecha_inicio=${inicio}&fecha_fin=${fin}`
      )
      if (!res.ok) throw new Error(t.comun.error)
      setDatos(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.comun.error)
    } finally {
      setLoading(false)
    }
  }, [t.comun.error])

  useEffect(() => { cargar(fechaInicio, fechaFin) }, [])

  const handleFechaInicioChange = (val: string) => {
    setFechaInicio(val)
    if (val && fechaFin) cargar(val, fechaFin)
  }

  const handleFechaFinChange = (val: string) => {
    setFechaFin(val)
    if (fechaInicio && val) cargar(fechaInicio, val)
  }

  // Separar propiedades con y sin movimiento para mostrarlas diferente
  const conMovimiento = datos?.propiedades.filter((p) => p.ingresos > 0 || p.gastos > 0) ?? []
  const sinMovimiento = datos?.propiedades.filter((p) => p.ingresos === 0 && p.gastos === 0) ?? []

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/reportes/financiero"
          className="mb-2 flex items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {r.volverFinanciero}
        </Link>
        <h1 className="text-3xl font-bold">{r.titulo}</h1>
        <p className="text-muted-foreground">{r.descripcion}</p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{r.rangoFechas}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{r.fechaInicio}</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => handleFechaInicioChange(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{r.fechaFin}</label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => handleFechaFinChange(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => cargar(fechaInicio, fechaFin)} disabled={loading}>
                {loading ? r.cargando : r.actualizar}
              </Button>
            </div>
          </div>
          {datos && (
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDate(datos.fecha_inicio)} — {formatDate(datos.fecha_fin)}
              {" · "}{datos.propiedades.length} {datos.propiedades.length === 1 ? "propiedad" : "propiedades"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Consolidado */}
      {datos && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">{r.totalIngresos}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-800">{formatCOP(datos.consolidado.ingresos)}</p>
              <p className="text-xs text-green-600">{r.reciboEmitidos}</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700">{r.totalGastos}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-800">{formatCOP(datos.consolidado.gastos)}</p>
              <p className="text-xs text-red-600">{r.costosMantenimiento}</p>
            </CardContent>
          </Card>

          <Card className={datos.consolidado.neto >= 0 ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-orange-50"}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${datos.consolidado.neto >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                {r.resultadoNeto}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${datos.consolidado.neto >= 0 ? "text-blue-800" : "text-orange-800"}`}>
                {formatCOP(datos.consolidado.neto)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sin propiedades */}
      {datos && datos.propiedades.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{r.sinDatos}</CardContent>
        </Card>
      )}

      {/* Tabla principal: propiedades con movimiento */}
      {datos && datos.propiedades.length > 0 && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>{r.detallePorPropiedad}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{r.columnas.propiedad}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{r.columnas.estado}</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">{r.columnas.ingresos}</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">{r.columnas.gastos}</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">{r.columnas.porcentajeGastos}</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">{r.columnas.neto}</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.propiedades.map((p, idx) => {
                      const porcentaje = pct(p.gastos, p.ingresos)
                      const esNegativo = p.neto < 0
                      const sinMov = p.ingresos === 0 && p.gastos === 0

                      return (
                        <tr
                          key={p.propiedad_id}
                          className={`border-b ${sinMov ? "opacity-50" : idx % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">{p.direccion}</p>
                            {p.ciudad && <p className="text-xs text-muted-foreground">{p.ciudad}</p>}
                            {p.valor_arriendo_mensual > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Canon: {formatCOP(p.valor_arriendo_mensual)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[p.estado] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                              {p.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700">
                            {p.ingresos > 0 ? formatCOP(p.ingresos) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">
                            {p.gastos > 0 ? formatCOP(p.gastos) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {porcentaje !== null ? `${porcentaje}%` : "—"}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${sinMov ? "text-muted-foreground" : esNegativo ? "text-orange-700" : "text-blue-700"}`}>
                            {sinMov ? "—" : formatCOP(p.neto)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sinMov
                              ? <Minus className="mx-auto h-4 w-4 text-muted-foreground" />
                              : esNegativo
                                ? <TrendingDown className="mx-auto h-4 w-4 text-orange-600" />
                                : <TrendingUp className="mx-auto h-4 w-4 text-green-600" />
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>

                  {/* Total solo si hay propiedades con movimiento */}
                  {conMovimiento.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 bg-muted/40 font-bold">
                        <td className="px-4 py-3" colSpan={2}>{r.total}</td>
                        <td className="px-4 py-3 text-right text-green-700">{formatCOP(datos.consolidado.ingresos)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatCOP(datos.consolidado.gastos)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {pct(datos.consolidado.gastos, datos.consolidado.ingresos) !== null
                            ? `${pct(datos.consolidado.gastos, datos.consolidado.ingresos)}%`
                            : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right ${datos.consolidado.neto < 0 ? "text-orange-700" : "text-blue-800"}`}>
                          {formatCOP(datos.consolidado.neto)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {datos.consolidado.neto >= 0
                            ? <TrendingUp className="mx-auto h-5 w-5 text-green-600" />
                            : <TrendingDown className="mx-auto h-5 w-5 text-orange-600" />
                          }
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Nota propiedades sin movimiento */}
              {sinMovimiento.length > 0 && (
                <p className="px-4 py-3 text-xs text-muted-foreground border-t">
                  {sinMovimiento.length} propiedad{sinMovimiento.length !== 1 ? "es" : ""} sin movimiento en el período (mostradas en gris)
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
