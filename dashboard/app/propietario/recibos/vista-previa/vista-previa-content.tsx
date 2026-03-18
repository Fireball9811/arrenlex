"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Send, X, Printer, Loader2, Download } from "lucide-react"
import Link from "next/link"

export default function VistaPreviaReciboContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reciboId = searchParams.get("recibo_id")
  const reciboRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recibo, setRecibo] = useState<any>(null)
  const [mostrarModalEmail, setMostrarModalEmail] = useState(false)
  const [emailDestino, setEmailDestino] = useState("")

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
    if (!reciboId || !recibo) return

    // Abrir modal para confirmar y permitir cambiar email
    // Buscar email del arrendatario desde el contrato si existe
    let emailSugerido = recibo.arrendatario_email || recibo.arrendador_email || ""

    setEmailDestino(emailSugerido)
    setMostrarModalEmail(true)
  }

  const confirmarEnvio = async () => {
    if (!reciboId) return

    setMostrarModalEmail(false)
    setSending(true)
    try {
      const res = await fetch(`/api/recibos-pago/${reciboId}/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDestino }),
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

  const cancelarEnvio = () => {
    setMostrarModalEmail(false)
    setEmailDestino("")
  }

  const handleImprimir = () => {
    // Crear una ventana nueva solo con el contenido del recibo
    if (!reciboRef.current) return

    const printContent = reciboRef.current.innerHTML
    const printWindow = window.open("", "_blank")

    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recibo ${recibo?.numero_recibo || reciboId}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              background: white;
            }
            .recibo-container {
              max-width: 800px;
              margin: 0 auto;
            }
            img {
              max-height: 60px;
              width: auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            .border-b {
              border-bottom: 1px solid #ddd;
            }
            .border-t {
              border-top: 1px solid #ddd;
            }
            .border {
              border: 1px solid #ccc;
            }
            .border-gray-300 {
              border-color: #ccc;
            }
            .rounded-lg {
              border-radius: 8px;
            }
            .p-4, .p-6, .p-8 {
              padding: 16px;
            }
            .p-12 {
              padding: 48px;
            }
            .mb-1, .mb-2, .mb-3, .mb-6, .mb-8, .mb-16 {
              margin-bottom: 4px;
            }
            .mb-8 { margin-bottom: 32px; }
            .mb-6 { margin-bottom: 24px; }
            .mb-16 { margin-bottom: 64px; }
            .pb-2, .pb-6 {
              padding-bottom: 8px;
            }
            .pb-6 { padding-bottom: 24px; }
            .pt-2, .pt-4 {
              padding-top: 8px;
            }
            .gap-4, .gap-16 {
              gap: 16px;
            }
            .gap-16 { gap: 64px; }
            .grid {
              display: grid;
            }
            .grid-cols-1 {
              grid-template-columns: repeat(1, minmax(0, 1fr));
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .font-bold {
              font-weight: bold;
            }
            .text-sm {
              font-size: 14px;
            }
            .text-xs {
              font-size: 12px;
            }
            .text-2xl {
              font-size: 24px;
            }
            .text-4xl {
              font-size: 36px;
            }
            .text-gray-500 {
              color: #6b7280;
            }
            .text-gray-600 {
              color: #4b5563;
            }
            .text-gray-700 {
              color: #374151;
            }
            .text-gray-800 {
              color: #1f2937;
            }
            .text-blue-800 {
              color: #1e40af;
            }
            .inline-block {
              display: inline-block;
            }
            .w-24 {
              width: 96px;
            }
            .w-2\/5 {
              width: 40%;
            }
            .flex {
              display: flex;
            }
            .items-center {
              align-items: center;
            }
            .justify-between {
              justify-content: space-between;
            }
            .items-start {
              align-items: flex-start;
            }
            .mr-2, .mr-4 {
              margin-right: 8px;
            }
            .mr-4 { margin-right: 16px; }
            .mt-1, .mt-8 {
              margin-top: 4px;
            }
            .mt-8 { margin-top: 32px; }
            .bg-white {
              background-color: white;
            }
            .bg-gray-100 {
              background-color: #f3f4f6;
            }
            .py-3 {
              padding-top: 12px;
              padding-bottom: 12px;
            }
            .border-b-2 {
              border-bottom-width: 2px;
            }
            .border-gray-800 {
              border-color: #1f2937;
            }
            .shadow-lg {
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }
            .italic {
              font-style: italic;
            }
            @media (min-width: 768px) {
              .md\\:grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
              .md\\:p-12 {
                padding: 48px;
              }
              .md\\:gap-4 {
                gap: 16px;
              }
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `)
      printWindow.document.close()

      // Esperar a que cargue y luego imprimir
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  const handleGenerarPDF = () => {
    if (!reciboId) return
    // Abrir la página de impresión dedicada en nueva ventana (sin layout)
    window.open(`/imprimir-recibo/${reciboId}`, "_blank")
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
          <Button onClick={handleGenerarPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
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
      <div ref={reciboRef} className="recibo-container bg-white shadow-lg rounded-lg p-8 md:p-12">
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

        {/* Información de partes - CORREGIDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="font-bold text-sm mb-3 pb-2 border-b text-gray-700">ARRENDATARIO (PAGADOR)</h3>
            <p className="text-sm mb-1"><span className="font-semibold inline-block w-24">Nombre:</span> {recibo.arrendador_nombre || "N/A"}</p>
            <p className="text-sm"><span className="font-semibold inline-block w-24">Cédula:</span> {recibo.arrendador_cedula || "N/A"}</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="font-bold text-sm mb-3 pb-2 border-b text-gray-700">PROPIETARIO (RECEPTOR)</h3>
            <p className="text-sm mb-1"><span className="font-semibold inline-block w-24">Nombre:</span> {recibo.propietario_nombre || "N/A"}</p>
            <p className="text-sm"><span className="font-semibold inline-block w-24">Cédula:</span> {recibo.propietario_cedula || "N/A"}</p>
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

        {/* Firmas - CORREGIDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-16">
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mb-1">{recibo.arrendador_nombre || ""}</div>
            <p className="text-sm text-gray-600">ARRENDATARIO (PAGADOR)</p>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mb-1">{recibo.propietario_nombre || ""}</div>
            <p className="text-sm text-gray-600">PROPIETARIO (RECEPTOR)</p>
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
        <Button onClick={handleGenerarPDF} variant="outline" className="flex-1 max-w-xs">
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
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

      {/* Modal de confirmación de envío de email */}
      {mostrarModalEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Enviar Recibo por Email</CardTitle>
              <CardDescription>
                Confirma el destino del recibo antes de enviarlo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email del destinatario (arrendatario)
                </label>
                <Input
                  type="email"
                  value={emailDestino}
                  onChange={(e) => setEmailDestino(e.target.value)}
                  placeholder="ejemplo@correo.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  El recibo será enviado a esta dirección de correo
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900 mb-1">Detalles del recibo:</p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• N° Recibo: <strong>{recibo?.numero_recibo || "N/A"}</strong></li>
                  <li>• Valor: <strong>${Number(recibo?.valor_arriendo || 0).toLocaleString("es-CO")}</strong></li>
                  <li>• Arrendatario: <strong>{recibo?.arrendador_nombre || "N/A"}</strong></li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={confirmarEnvio}
                  disabled={!emailDestino || sending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Confirmar y Enviar
                    </>
                  )}
                </Button>
                <Button
                  onClick={cancelarEnvio}
                  variant="outline"
                  disabled={sending}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estilos para impresión (ya no necesarios pero se mantienen por compatibilidad) */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
