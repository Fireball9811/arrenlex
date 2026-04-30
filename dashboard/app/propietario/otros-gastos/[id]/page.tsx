"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Mail, Printer } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

type OtroGastoDetalle = {
  id: string
  propiedad_id: string
  user_id: string
  nombre_completo: string
  cedula: string
  tarjeta_profesional: string | null
  correo_electronico: string | null
  motivo_pago: string
  descripcion_trabajo: string
  fecha_realizacion: string
  valor: number
  banco: string | null
  referencia_pago: string | null
  numero_recibo: string
  fecha_emision: string
  estado: "pendiente" | "emitido" | "cancelado"
  created_at: string
  propiedades: {
    id: string
    direccion: string
    ciudad: string
    barrio: string
    titulo: string
  } | null
  users: {
    email: string
    nombre: string | null
  } | null
}

export default function PropietarioOtrosGastoDetallePage() {
  const { t } = useLang()
  const params = useParams()
  const router = useRouter()
  const [gasto, setGasto] = useState<OtroGastoDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const fetchGasto = async () => {
      const res = await fetch(`/api/otros-gastos/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setGasto(data)
      }
      setLoading(false)
    }
    fetchGasto()
  }, [params.id])

  const handlePrint = () => {
    window.print()
  }

  const handleSendEmail = async () => {
    if (!gasto?.correo_electronico) return
    setSending(true)
    try {
      const res = await fetch(`/api/otros-gastos/${gasto.id}/enviar-recibo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: gasto.correo_electronico,
        }),
      })
      if (res.ok) {
        alert("Recibo enviado correctamente")
      } else {
        alert("Error al enviar el recibo")
      }
    } catch {
      alert("Error de conexión")
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
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

  const valorLetras = (val: number) => {
    // Función simple para convertir número a letras (puede mejorarse)
    const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"]
    const decenas = ["", "diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]
    if (val < 10) return unidades[val] || "cero"
    if (val < 100) return decenas[Math.floor(val / 10)] + (val % 10 !== 0 ? " y " + unidades[val % 10] : "")
    return formatValor(val)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{t.comun.cargando}</p>
      </div>
    )
  }

  if (!gasto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Gasto no encontrado</p>
        <Button onClick={() => router.back()}>{t.comun.volver}</Button>
      </div>
    )
  }

  const propiedad = gasto.propiedades
  const propietario = gasto.users

  return (
    <div>
      <div className="mb-6 flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.comun.volver}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t.otrosGastos.detalle.titulo}</h1>
            <p className="text-sm text-muted-foreground">{gasto.numero_recibo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          {gasto.correo_electronico && gasto.estado === "emitido" && (
            <Button variant="default" size="sm" onClick={handleSendEmail} disabled={sending}>
              <Mail className="mr-2 h-4 w-4" />
              {sending ? "Enviando..." : t.otrosGastos.enviarRecibo}
            </Button>
          )}
        </div>
      </div>

      {/* RECIBO PARA IMPRESIÓN */}
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-8 border-b pb-6">
            <div className="flex items-center gap-4">
              <img src="/Logo2.png" alt="Arrenlex" className="h-20 w-auto" />
              <div>
                <h2 className="text-2xl font-bold text-green-700">ARRENLEX</h2>
                <p className="text-sm text-muted-foreground">Gestión de Arrendamientos</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t.otrosGastos.recibo.numeroRecibo}</p>
              <p className="text-xl font-bold font-mono">{gasto.numero_recibo}</p>
              <p className="text-sm text-muted-foreground mt-2">{t.otrosGastos.recibo.fechaEmision}</p>
              <p className="font-medium">{formatDate(gasto.fecha_emision)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">{t.otrosGastos.recibo.pagadoA}</h3>
              <p className="font-bold text-lg">{gasto.nombre_completo}</p>
              <p className="text-sm">{t.otrosGastos.recibo.cedula}: {gasto.cedula}</p>
              {gasto.tarjeta_profesional && (
                <p className="text-sm">{t.otrosGastos.recibo.tarjetaProfesional}: {gasto.tarjeta_profesional}</p>
              )}
              {gasto.correo_electronico && (
                <p className="text-sm">{gasto.correo_electronico}</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">{t.otrosGastos.recibo.emitidoPor}</h3>
              <p className="font-bold text-lg">{propietario?.nombre || propietario?.email || "Propietario"}</p>
              {propietario?.email && <p className="text-sm">{propietario.email}</p>}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">{t.otrosGastos.recibo.porConceptoDe}</h3>
            <p className="font-bold text-xl mb-2">{gasto.motivo_pago}</p>
            <p className="text-muted-foreground">{gasto.descripcion_trabajo}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">{t.otrosGastos.recibo.propiedad}</p>
              <p className="font-medium">{propiedad?.titulo || [propiedad?.direccion, propiedad?.ciudad].filter(Boolean).join(", ") || gasto.propiedad_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.otrosGastos.recibo.fechaRealizacion}</p>
              <p className="font-medium">{formatDate(gasto.fecha_realizacion)}</p>
            </div>
          </div>

          <div className="border-t pt-6 mb-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t.otrosGastos.recibo.valor}</p>
                <p className="text-3xl font-bold text-green-700">{formatValor(gasto.valor)}</p>
              </div>
              {gasto.banco && (
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">{t.otrosGastos.recibo.bancoConsignacion}</p>
                  <p className="font-medium">{gasto.banco}</p>
                  {gasto.referencia_pago && (
                    <>
                      <p className="text-muted-foreground">{t.otrosGastos.recibo.referenciaPago}</p>
                      <p className="font-medium font-mono">{gasto.referencia_pago}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6 mb-8">
            <p className="text-sm text-muted-foreground mb-1">Valor en letras:</p>
            <p className="font-medium italic">{valorLetras(gasto.valor)} pesos colombianos</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t">
            <div className="text-center">
              <div className="border-b border-dashed mb-2 pb-1"></div>
              <p className="text-sm font-medium">{t.otrosGastos.recibo.proveedorFirma}</p>
              <p className="text-xs text-muted-foreground">{gasto.nombre_completo}</p>
              <p className="text-xs text-muted-foreground">C.C. {gasto.cedula}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-dashed mb-2 pb-1"></div>
              <p className="text-sm font-medium">{t.otrosGastos.recibo.propietarioFirma}</p>
              <p className="text-xs text-muted-foreground">{propietario?.nombre || propietario?.email || "Propietario"}</p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t text-center">
            <Badge variant={gasto.estado === "emitido" ? "default" : gasto.estado === "cancelado" ? "destructive" : "secondary"} className="text-base px-4 py-1">
              Estado: {t.otrosGastos.estados[gasto.estado]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          @page {
            margin: 0;
            size: A4 portrait;
          }
        }
      `}</style>
    </div>
  )
}
