"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Send, X, Printer, Loader2 } from "lucide-react"
import Link from "next/link"

export default function VistaPreviaReciboContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reciboId = searchParams.get("recibo_id")

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recibo, setRecibo] = useState<any>(null)

  // Cargar datos del recibo
  useEffect(() => {
    if (!reciboId) {
      setError("No se especificó el recibo")
      setLoading(false)
      return
    }

    fetch(`/api/recibos-pago/${reciboId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          setError("Recibo no encontrado")
          return
        }
        setRecibo(data)
        setLoading(false)
      })
      .catch(() => {
        setError("Error al cargar el recibo")
        setLoading(false)
      })
  }, [reciboId])

  const handleEnviar = async () => {
    if (!reciboId) return

    setSending(true)
    try {
      const res = await fetch(`/api/recibos-pago/${reciboId}/enviar`, {
        method: "POST",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error al enviar el email")
      }

      alert("Recibo enviado correctamente al arrendatario")
      router.push("/propietario/recibos")
    } catch (err: any) {
      setError(`Error al enviar: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleImprimir = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !recibo) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 font-semibold">{error || "Recibo no encontrado"}</p>
            <Link href="/propietario/recibos" className="mt-4 inline-block">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl mx-auto py-8">
      {/* Header con botones - no se imprime */}
      <div className="print:hidden mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/propietario/recibos">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Vista Previa del Recibo</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleImprimir} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handleEnviar} disabled={sending} className="bg-green-600 hover:bg-green-700">
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar por Email
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="print:hidden border-red-200 bg-red-50 mb-6">
          <CardContent className="pt-6">
            <p className="text-red-600 font-semibold">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* RECIBO - Estilo profesional */}
      <div className="bg-white shadow-lg rounded-lg p-8 md:p-12">
        {/* Encabezado con logo */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-800">
          <div className="flex items-center">
            <img src="/Logo.png" alt="Arrenlex" className="h-16 w-auto mr-4" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Arrenlex</h1>
              <p className="text-xs text-gray-500">Gestión de Arrendamiento</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Recibo No:</span> {recibo.numero_recibo || "N/A"}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Fecha:</span> {new Date(recibo.fecha_recibo).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>

        {/* Información de partes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="font-bold text-sm mb-3 pb-2 border-b text-gray-700">PROPIETARIO (PAGADOR)</h3>
            <p className="text-sm mb-1"><span className="font-semibold inline-block w-24">Nombre:</span> {recibo.propietario_nombre || "N/A"}</p>
            <p className="text-sm"><span className="font-semibold inline-block w-24">Cédula:</span> {recibo.propietario_cedula || "N/A"}</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="font-bold text-sm mb-3 pb-2 border-b text-gray-700">ARRENDATARIO (RECEPTOR)</h3>
            <p className="text-sm mb-1"><span className="font-semibold inline-block w-24">Nombre:</span> {recibo.arrendador_nombre || "N/A"}</p>
            <p className="text-sm"><span className="font-semibold inline-block w-24">Cédula:</span> {recibo.arrendador_cedula || "N/A"}</p>
          </div>
        </div>

        {/* Inmueble */}
        <div className="border border-gray-300 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-sm mb-3 pb-2 border-b text-gray-700">INMUEBLE</h3>
          <p className="text-sm mb-1"><span className="font-semibold inline-block w-24">Dirección:</span> {recibo.propiedad?.direccion || "N/A"}</p>
          <p className="text-sm mb-1"><span className="font-semibold inline-block w-24">Barrio:</span> {recibo.propiedad?.barrio || "N/A"}</p>
          <p className="text-sm"><span className="font-semibold inline-block w-24">Ciudad:</span> {recibo.propiedad?.ciudad || "N/A"}</p>
        </div>

        {/* Valor */}
        <div className="bg-gray-100 rounded-lg p-6 text-center mb-6">
          <div className="text-4xl font-bold text-blue-800 mb-2">
            $ {Number(recibo.valor_arriendo || 0).toLocaleString("es-CO")}
          </div>
          <div className="text-sm text-gray-600 italic">
            {recibo.valor_arriendo_letras || ""}
          </div>
        </div>

        {/* Detalles */}
        <div className="mb-6">
          <table className="w-full">
            <tbody>
              <tr className="border-b">
                <td className="py-3 font-bold text-sm w-2/5">Concepto de Pago:</td>
                <td className="py-3 text-sm">
                  {recibo.tipo_pago === "arriendo" ? "Canon de Arrendamiento" : recibo.tipo_pago === "servicios" ? "Servicios Públicos" : recibo.tipo_pago || "N/A"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 font-bold text-sm">Período Cancelado:</td>
                <td className="py-3 text-sm">
                  Del {recibo.fecha_inicio_periodo ? new Date(recibo.fecha_inicio_periodo).toLocaleDateString("es-CO") : "N/A"} al {recibo.fecha_fin_periodo ? new Date(recibo.fecha_fin_periodo).toLocaleDateString("es-CO") : "N/A"}
                </td>
              </tr>
              {recibo.cuenta_consignacion && (
                <tr className="border-b">
                  <td className="py-3 font-bold text-sm">Cuenta Consignación:</td>
                  <td className="py-3 text-sm">{recibo.cuenta_consignacion}</td>
                </tr>
              )}
              {recibo.referencia_pago && (
                <tr className="border-b">
                  <td className="py-3 font-bold text-sm">Referencia de Pago:</td>
                  <td className="py-3 text-sm">{recibo.referencia_pago}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Notas */}
        {recibo.nota && (
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-sm mb-2 pb-2 border-b text-gray-700">NOTAS ADICIONALES</h3>
            <p className="text-sm">{recibo.nota}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
          <p>Este recibo constituye prueba válida de pago del canon de arrendamiento correspondiente al período especificado.</p>
          <p className="mt-1">Fecha de expedición: {new Date().toLocaleDateString("es-CO")}</p>
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-16">
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mb-1">{recibo.propietario_nombre || ""}</div>
            <p className="text-sm text-gray-600">PROPIETARIO</p>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mb-1">{recibo.arrendador_nombre || ""}</div>
            <p className="text-sm text-gray-600">ARRENDATARIO</p>
          </div>
        </div>
      </div>

      {/* Botones de acción al final - no se imprimen */}
      <div className="print:hidden mt-8 flex flex-col sm:flex-row gap-4 justify-center border-t pt-6">
        <Link href={`/propietario/recibos/nuevo?propiedad_id=${recibo.propiedad_id}`} className="flex-1 max-w-xs">
          <Button variant="outline" className="w-full">
            <X className="mr-2 h-4 w-4" />
            Cancelar y Editar
          </Button>
        </Link>
        <Button onClick={handleImprimir} variant="outline" className="flex-1 max-w-xs">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={handleEnviar} disabled={sending} className="flex-1 max-w-xs bg-green-600 hover:bg-green-700">
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Enviar por Email
            </>
          )}
        </Button>
      </div>

      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  )
}
