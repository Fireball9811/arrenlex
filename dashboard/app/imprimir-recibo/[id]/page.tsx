"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { formatCalendarDateEs } from "@/lib/utils/calendar-date"

type Recibo = {
  id: string
  numero_recibo: string
  fecha_recibo: string
  arrendador_nombre: string
  arrendador_cedula: string
  propietario_nombre: string
  propietario_cedula: string
  valor_arriendo: number
  valor_arriendo_letras: string
  fecha_inicio_periodo: string
  fecha_fin_periodo: string
  tipo_pago: string
  cuenta_consignacion: string
  referencia_pago: string
  nota: string
  propiedad: {
    direccion: string
    ciudad: string
    barrio: string
  }
}

export default function ImprimirReciboPage() {
  const params = useParams()
  const reciboId = params.id as string

  const [recibo, setRecibo] = useState<Recibo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/recibos-pago/${reciboId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setRecibo(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [reciboId])

  // Auto imprimir cuando carga
  useEffect(() => {
    if (!loading && recibo) {
      // Marcar el recibo como completado al imprimir/descargar
      fetch(`/api/recibos-pago/${reciboId}/pdf`, { method: "GET" })
        .catch(() => {}) // No es crítico si falla, no mostrar error
      setTimeout(() => window.print(), 500)
    }
  }, [loading, recibo, reciboId])

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  if (loading) {
    return <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>Cargando recibo...</div>
  }

  if (!recibo) {
    return <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", color: "red" }}>Recibo no encontrado</div>
  }

  return (
    <div id="RECIBO-PAGO" style={{ fontFamily: "Arial, sans-serif", fontSize: "14px", lineHeight: "1.4", color: "#333", background: "white", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Botón solo visible en pantalla */}
      <div className="no-print" style={{ marginBottom: "20px", padding: "10px", background: "#f0f0f0", textAlign: "center" }}>
        <button onClick={() => window.print()} style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>
          🖨️ Imprimir / Guardar PDF
        </button>
        <button onClick={() => window.close()} style={{ padding: "10px 20px", background: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px", marginLeft: "10px" }}>
          Cerrar
        </button>
      </div>

      {/* Encabezado */}
      <div style={{ textAlign: "center", marginBottom: "30px", borderBottom: "2px solid #333", paddingBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", margin: "0 0 10px 0" }}>RECIBO DE PAGO</h1>
        <p style={{ fontSize: "12px", margin: 0, color: "#666" }}>
          No. {recibo.numero_recibo || "N/A"} | Fecha: {formatCalendarDateEs(recibo.fecha_recibo, "N/A")}
        </p>
      </div>

      {/* Información de partes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
        <div style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "4px" }}>
          <h3 style={{ fontSize: "14px", margin: "0 0 10px 0", color: "#555", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>ARRENDATARIO (PAGADOR)</h3>
          <p style={{ margin: "0 0 5px 0", fontSize: "13px" }}><strong style={{ display: "inline-block", width: "80px" }}>Nombre:</strong> {recibo.arrendador_nombre || "N/A"}</p>
          <p style={{ margin: 0, fontSize: "13px" }}><strong style={{ display: "inline-block", width: "80px" }}>Cédula:</strong> {recibo.arrendador_cedula || "N/A"}</p>
        </div>
        <div style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "4px" }}>
          <h3 style={{ fontSize: "14px", margin: "0 0 10px 0", color: "#555", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>PROPIETARIO (RECEPTOR)</h3>
          <p style={{ margin: "0 0 5px 0", fontSize: "13px" }}><strong style={{ display: "inline-block", width: "80px" }}>Nombre:</strong> {recibo.propietario_nombre || "N/A"}</p>
          <p style={{ margin: 0, fontSize: "13px" }}><strong style={{ display: "inline-block", width: "80px" }}>Cédula:</strong> {recibo.propietario_cedula || "N/A"}</p>
        </div>
      </div>

      {/* Inmueble */}
      <div style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "4px", marginBottom: "30px" }}>
        <h3 style={{ fontSize: "14px", margin: "0 0 10px 0", color: "#555", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>INMUEBLE</h3>
        <p style={{ margin: "0 0 5px 0", fontSize: "13px" }}><strong style={{ display: "inline-block", width: "80px" }}>Dirección:</strong> {recibo.propiedad?.direccion || "N/A"}</p>
        <p style={{ margin: "0 0 5px 0", fontSize: "13px" }}><strong style={{ display: "inline-block", width: "80px" }}>Barrio:</strong> {recibo.propiedad?.barrio || "N/A"}</p>
        <p style={{ margin: 0, fontSize: "13px" }}><strong style={{ display: "inline-block", width: "80px" }}>Ciudad:</strong> {recibo.propiedad?.ciudad || "N/A"}</p>
      </div>

      {/* Valor */}
      <div style={{ background: "#f8f9fa", padding: "20px", textAlign: "center", borderRadius: "4px", marginBottom: "30px", border: "1px solid #dee2e6" }}>
        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#1a365d", margin: "0 0 10px 0" }}>
          $ {formatPeso(recibo.valor_arriendo || 0)}
        </div>
        <div style={{ fontSize: "14px", color: "#666", fontStyle: "italic", margin: 0 }}>
          {recibo.valor_arriendo_letras || ""}
        </div>
      </div>

      {/* Detalles */}
      <div style={{ marginBottom: "30px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px", fontWeight: "bold", width: "40%" }}>Concepto de Pago:</td>
              <td style={{ padding: "10px" }}>
                {recibo.tipo_pago === "arriendo" ? "Canon de Arrendamiento" : recibo.tipo_pago === "deposito" ? "Depósito" : recibo.tipo_pago === "servicios" ? "Servicios Públicos" : recibo.tipo_pago || "N/A"}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px", fontWeight: "bold" }}>Período Cancelado:</td>
              <td style={{ padding: "10px" }}>
                Del {recibo.fecha_inicio_periodo ? formatCalendarDateEs(recibo.fecha_inicio_periodo, "N/A") : "N/A"} al {recibo.fecha_fin_periodo ? formatCalendarDateEs(recibo.fecha_fin_periodo, "N/A") : "N/A"}
              </td>
            </tr>
            {recibo.cuenta_consignacion && (
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px", fontWeight: "bold" }}>Cuenta Consignación:</td>
                <td style={{ padding: "10px" }}>{recibo.cuenta_consignacion}</td>
              </tr>
            )}
            {recibo.referencia_pago && (
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px", fontWeight: "bold" }}>Referencia de Pago:</td>
                <td style={{ padding: "10px" }}>{recibo.referencia_pago}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notas */}
      {recibo.nota && (
        <div style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "4px", marginBottom: "30px" }}>
          <h3 style={{ fontSize: "14px", margin: "0 0 10px 0", color: "#555", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>NOTAS ADICIONALES</h3>
          <p style={{ margin: 0, fontSize: "13px", whiteSpace: "pre-wrap" }}>{recibo.nota}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "11px", color: "#666", marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #ddd" }}>
        <p style={{ margin: "0 0 5px 0" }}>Este recibo constituye prueba válida de pago correspondiente al período especificado.</p>
        <p style={{ margin: 0 }}>Fecha de expedición: {new Date().toLocaleDateString("es-CO")}</p>
      </div>

      {/* Firmas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", marginTop: "80px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #333", paddingTop: "10px", marginBottom: "5px", fontWeight: "bold" }}>{recibo.arrendador_nombre || ""}</div>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>ARRENDATARIO (PAGADOR)</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #333", paddingTop: "10px", marginBottom: "5px", fontWeight: "bold" }}>{recibo.propietario_nombre || ""}</div>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>PROPIETARIO (RECEPTOR)</p>
        </div>
      </div>

      {/* CSS para impresión */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print {
              display: none !important;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              background: white !important;
            }

            #RECIBO-PAGO {
              margin: 0 !important;
              padding: 30px !important;
              max-width: 100% !important;
            }

            @page {
              margin: 0.5cm;
              size: A4 portrait;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `
      }} />
    </div>
  )
}
