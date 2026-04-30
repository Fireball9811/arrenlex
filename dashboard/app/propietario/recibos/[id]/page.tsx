"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Edit2, Download, Trash2 } from "lucide-react"
import { formatCalendarDateEs } from "@/lib/utils/calendar-date"

interface ReciboPago {
  id: string
  propiedad_id: string
  arrendador_nombre: string
  arrendador_cedula: string
  propietario_nombre: string
  propietario_cedula: string
  valor_arriendo: number
  valor_arriendo_letras: string
  fecha_inicio_periodo: string
  fecha_fin_periodo: string
  tipo_pago: string
  fecha_recibo: string
  numero_recibo: string
  cuenta_consignacion: string
  referencia_pago: string
  nota: string
  estado: string
}

export default function VerReciboPagoPage() {
  const router = useRouter()
  const params = useParams()
  const reciboId = params.id as string

  const [loading, setLoading] = useState(true)
  const [recibo, setRecibo] = useState<ReciboPago | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: string } | null) => {
        if (data?.role === "inquilino") {
          router.replace("/inquilino/dashboard")
          return
        }

        return fetch(`/api/recibos-pago/${reciboId}`)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
          })
          .then((data: ReciboPago) => {
            setRecibo(data)
            setLoading(false)
          })
          .catch((err) => {
            setError(`Error: ${err.message}`)
            setLoading(false)
          })
      })
      .catch(() => {
        setError("Error de autenticación")
        setLoading(false)
      })
  }, [router, reciboId])

  if (loading) {
    return <p className="text-muted-foreground">Cargando recibo...</p>
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600 font-semibold">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!recibo) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <p className="text-yellow-600 font-semibold">Recibo no encontrado</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div suppressHydrationWarning>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/propietario/recibos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/propietario/recibos/${recibo.id}/editar`}>
            <Button variant="outline" size="sm">
              <Edit2 className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/imprimir-recibo/${recibo.id}`, "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (window.confirm("¿Eliminar este recibo?")) {
                fetch(`/api/recibos-pago/${recibo.id}`, {
                  method: "DELETE",
                })
                  .then(() => {
                    router.push("/propietario/recibos")
                  })
                  .catch(() => {
                    alert("Error al eliminar el recibo")
                  })
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Simulación de Recibo */}
      <Card className="border-2">
        <CardContent className="pt-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Encabezado */}
            <div className="text-center border-b-2 pb-4">
              <h1 className="text-3xl font-bold">RECIBO DE PAGO</h1>
              <p className="text-muted-foreground">Nº {recibo.numero_recibo || recibo.id.slice(0, 8)}</p>
              <p className="text-sm text-muted-foreground">{formatCalendarDateEs(recibo.fecha_recibo)}</p>
            </div>

            {/* Información de Partes */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">ARRENDADOR:</p>
                <p className="text-lg font-bold">{recibo.arrendador_nombre}</p>
                {recibo.arrendador_cedula && (
                  <p className="text-sm text-muted-foreground">C.C. {recibo.arrendador_cedula}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">PROPIETARIO:</p>
                <p className="text-lg font-bold">{recibo.propietario_nombre}</p>
                {recibo.propietario_cedula && (
                  <p className="text-sm text-muted-foreground">C.C. {recibo.propietario_cedula}</p>
                )}
              </div>
            </div>

            {/* Concepto */}
            <div className="border-y py-4">
              <p className="text-sm font-semibold text-muted-foreground">CONCEPTO:</p>
              <p className="text-lg font-bold capitalize">{recibo.tipo_pago}</p>
            </div>

            {/* Período */}
            <div className="border-y py-4">
              <p className="text-sm font-semibold text-muted-foreground">PERÍODO DE PAGO:</p>
              <p className="text-lg font-bold">
                Del {formatCalendarDateEs(recibo.fecha_inicio_periodo)} al{" "}
                {formatCalendarDateEs(recibo.fecha_fin_periodo)}
              </p>
            </div>

            {/* Valores */}
            <div className="border-2 border-dashed p-4 rounded bg-muted/50">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">VALOR A PAGAR:</p>
                <p className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0,
                  }).format(recibo.valor_arriendo || 0)}
                </p>
                <p className="text-sm italic text-muted-foreground">
                  ({recibo.valor_arriendo_letras})
                </p>
              </div>
            </div>

            {/* Información de Pago */}
            {(recibo.cuenta_consignacion || recibo.referencia_pago) && (
              <div className="border-y py-4">
                <p className="text-sm font-semibold text-muted-foreground mb-2">DATOS DE PAGO:</p>
                {recibo.cuenta_consignacion && (
                  <p className="text-sm">
                    <span className="font-semibold">Cuenta:</span> {recibo.cuenta_consignacion}
                  </p>
                )}
                {recibo.referencia_pago && (
                  <p className="text-sm">
                    <span className="font-semibold">Referencia:</span> {recibo.referencia_pago}
                  </p>
                )}
              </div>
            )}

            {/* Nota */}
            {recibo.nota && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                <p className="text-sm font-semibold text-muted-foreground mb-2">NOTAS:</p>
                <p className="text-sm whitespace-pre-wrap">{recibo.nota}</p>
              </div>
            )}

            {/* Firma */}
            <div className="border-t pt-6 grid grid-cols-2 gap-6 text-center">
              <div>
                <p className="h-12 border-t-2"></p>
                <p className="text-sm font-semibold">Firma Propietario</p>
              </div>
              <div>
                <p className="h-12 border-t-2"></p>
                <p className="text-sm font-semibold">Firma Arrendador</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
