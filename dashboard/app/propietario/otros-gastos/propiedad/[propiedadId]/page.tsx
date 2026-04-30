"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Download } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

type GastoHistorial = {
  id: string
  nombre_completo: string
  cedula: string
  motivo_pago: string
  descripcion_trabajo: string
  fecha_realizacion: string
  valor: number
  banco: string | null
  referencia_pago: string | null
  numero_recibo: string
  fecha_emision: string
  estado: string
  created_at: string
}

type PropiedadInfo = {
  id: string
  direccion: string
  ciudad: string
  titulo: string
}

type HistorialResponse = {
  propiedad: PropiedadInfo
  gastos: GastoHistorial[]
  resumen: {
    totalRegistros: number
    totalGastado: number
    porEstado: Record<string, number>
  }
}

export default function PropietarioOtrosGastosPropiedadPage() {
  const { t } = useLang()
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<HistorialResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistorial = async () => {
      const res = await fetch(`/api/otros-gastos/propiedad/${params.propiedadId}`)
      if (res.ok) {
        const historialData = await res.json()
        setData(historialData)
      }
      setLoading(false)
    }
    fetchHistorial()
  }, [params.propiedadId])

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  const formatValor = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const exportToExcel = () => {
    if (!data) return

    let csv = "Fecha,Recibo,Proveedor,Cédula,Motivo,Descripción,Valor,Banco,Referencia,Estado\n"

    data.gastos.forEach((g) => {
      csv += `"${formatDate(g.fecha_emision)}","${g.numero_recibo}","${g.nombre_completo}","${g.cedula}","${g.motivo_pago}","${g.descripcion_trabajo}",${g.valor},"${g.banco || ''}","${g.referencia_pago || ''}","${g.estado}"\n`
    })

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `gastos_${data.propiedad.titulo || data.propiedad.id}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{t.comun.cargando}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">No se pudo cargar la información</p>
        <Button onClick={() => router.back()}>{t.comun.volver}</Button>
      </div>
    )
  }

  const { propiedad, gastos, resumen } = data

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.comun.volver}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t.otrosGastos.historialPropiedad.titulo} {propiedad.titulo || propiedad.direccion}</h1>
            <p className="text-sm text-muted-foreground">{[propiedad.direccion, propiedad.ciudad].filter(Boolean).join(", ")}</p>
          </div>
        </div>
        {gastos.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            {t.otrosGastos.historialPropiedad.exportarExcel}
          </Button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.otrosGastos.historialPropiedad.cantidadRegistros}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{resumen.totalRegistros}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.otrosGastos.historialPropiedad.totalGastado}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{formatValor(resumen.totalGastado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emitidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{resumen.porEstado.emitido || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{resumen.porEstado.pendiente || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de gastos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial Completo de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {gastos.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No hay gastos registrados para esta propiedad</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.fecha}</th>
                    <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.recibo}</th>
                    <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.proveedor}</th>
                    <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.motivo}</th>
                    <th className="p-2 text-left font-medium">Descripción</th>
                    <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.valor}</th>
                    <th className="p-2 text-left font-medium">Banco</th>
                    <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.estado}</th>
                    <th className="p-2 text-left font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => (
                    <tr key={g.id} className="border-b">
                      <td className="p-2 whitespace-nowrap">{formatDate(g.fecha_emision)}</td>
                      <td className="p-2 font-mono text-xs">{g.numero_recibo}</td>
                      <td className="p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{g.nombre_completo}</span>
                          <span className="text-xs text-muted-foreground">{g.cedula}</span>
                        </div>
                      </td>
                      <td className="p-2">{g.motivo_pago}</td>
                      <td className="max-w-[200px] truncate p-2" title={g.descripcion_trabajo}>
                        {g.descripcion_trabajo}
                      </td>
                      <td className="p-2 font-medium">{formatValor(g.valor)}</td>
                      <td className="p-2">{g.banco || "—"}</td>
                      <td className="p-2">
                        <Badge
                          variant={
                            g.estado === "emitido"
                              ? "default"
                              : g.estado === "cancelado"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {t.otrosGastos.estados[g.estado as keyof typeof t.otrosGastos.estados] || g.estado}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Link
                          href={`/propietario/otros-gastos/${g.id}`}
                          className="inline-flex items-center rounded border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
