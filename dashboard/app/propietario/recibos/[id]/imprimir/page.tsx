"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

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
  const router = useRouter()
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
      setTimeout(() => window.print(), 300)
    }
  }, [loading, recibo])

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!recibo) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white", flexDirection: "column" }}>
        <p style={{ color: "red" }}>Recibo no encontrado</p>
        <button onClick={() => router.back()} style={{ marginTop: "16px", color: "blue", textDecoration: "underline" }}>
          Volver
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Controles - solo se ven en pantalla */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "#f3f4f6", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 9999, borderBottom: "1px solid #d1d5db" }} className="no-print">
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: "#374151" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <button onClick={() => window.print()} style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      {/* RECIBO - contenido principal */}
      <div id="recibo-contenido" style={{ background: "white", padding: "80px 40px 40px", minHeight: "100vh" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Encabezado */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", paddingBottom: "24px", borderBottom: "2px solid #1f2937" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img src="/Logo.png" alt="Arrenlex" style={{ height: "80px", width: "auto", marginRight: "16px" }} />
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "#1f2937" }}>Arrenlex</h1>
                <p style={{ fontSize: "14px", margin: "4px 0 0 0", color: "#6b7280" }}>Gestión de Arrendamiento</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "14px", margin: "0 0 4px 0", color: "#4b5563" }}>Recibo No:</p>
              <p style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 4px 0", color: "#1f2937" }}>{recibo.numero_recibo || "N/A"}</p>
              <p style={{ fontSize: "14px", margin: 0, color: "#6b7280" }}>{new Date(recibo.fecha_recibo).toLocaleDateString("es-CO")}</p>
            </div>
          </div>

          {/* Partes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 12px 0", paddingBottom: "8px", borderBottom: "1px solid #e5e7eb", color: "#374151" }}>ARRENDATARIO (PAGADOR)</h3>
              <p style={{ fontSize: "14px", margin: "0 0 4px 0" }}><strong style={{ display: "inline-block", width: "100px" }}>Nombre:</strong> {recibo.arrendador_nombre || "N/A"}</p>
              <p style={{ fontSize: "14px", margin: 0 }}><strong style={{ display: "inline-block", width: "100px" }}>Cédula:</strong> {recibo.arrendador_cedula || "N/A"}</p>
            </div>
            <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 12px 0", paddingBottom: "8px", borderBottom: "1px solid #e5e7eb", color: "#374151" }}>PROPIETARIO (RECEPTOR)</h3>
              <p style={{ fontSize: "14px", margin: "0 0 4px 0" }}><strong style={{ display: "inline-block", width: "100px" }}>Nombre:</strong> {recibo.propietario_nombre || "N/A"}</p>
              <p style={{ fontSize: "14px", margin: 0 }}><strong style={{ display: "inline-block", width: "100px" }}>Cédula:</strong> {recibo.propietario_cedula || "N/A"}</p>
            </div>
          </div>

          {/* Inmueble */}
          <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 12px 0", paddingBottom: "8px", borderBottom: "1px solid #e5e7eb", color: "#374151" }}>INMUEBLE</h3>
            <p style={{ fontSize: "14px", margin: "0 0 4px 0" }}><strong style={{ display: "inline-block", width: "100px" }}>Dirección:</strong> {recibo.propiedad?.direccion || "N/A"}</p>
            <p style={{ fontSize: "14px", margin: "0 0 4px 0" }}><strong style={{ display: "inline-block", width: "100px" }}>Barrio:</strong> {recibo.propiedad?.barrio || "N/A"}</p>
            <p style={{ fontSize: "14px", margin: 0 }}><strong style={{ display: "inline-block", width: "100px" }}>Ciudad:</strong> {recibo.propiedad?.ciudad || "N/A"}</p>
          </div>

          {/* Valor */}
          <div style={{ background: "#f3f4f6", borderRadius: "8px", padding: "24px", textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "36px", fontWeight: "bold", color: "#1e40af", marginBottom: "8px" }}>
              $ {formatPeso(recibo.valor_arriendo || 0)}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280", fontStyle: "italic" }}>
              {recibo.valor_arriendo_letras || ""}
            </div>
          </div>

          {/* Detalles */}
          <div style={{ marginBottom: "24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 8px", fontWeight: "bold", fontSize: "14px", width: "40%" }}>Concepto de Pago:</td>
                  <td style={{ padding: "12px 8px", fontSize: "14px" }}>
                    {recibo.tipo_pago === "arriendo" ? "Canon de Arrendamiento" : recibo.tipo_pago === "deposito" ? "Depósito" : recibo.tipo_pago === "servicios" ? "Servicios Públicos" : recibo.tipo_pago || "N/A"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 8px", fontWeight: "bold", fontSize: "14px" }}>Período Cancelado:</td>
                  <td style={{ padding: "12px 8px", fontSize: "14px" }}>
                    Del {recibo.fecha_inicio_periodo ? new Date(recibo.fecha_inicio_periodo).toLocaleDateString("es-CO") : "N/A"} al {recibo.fecha_fin_periodo ? new Date(recibo.fecha_fin_periodo).toLocaleDateString("es-CO") : "N/A"}
                  </td>
                </tr>
                {recibo.cuenta_consignacion && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px 8px", fontWeight: "bold", fontSize: "14px" }}>Cuenta Consignación:</td>
                    <td style={{ padding: "12px 8px", fontSize: "14px" }}>{recibo.cuenta_consignacion}</td>
                  </tr>
                )}
                {recibo.referencia_pago && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px 8px", fontWeight: "bold", fontSize: "14px" }}>Referencia de Pago:</td>
                    <td style={{ padding: "12px 8px", fontSize: "14px" }}>{recibo.referencia_pago}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notas */}
          {recibo.nota && (
            <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 8px 0", paddingBottom: "8px", borderBottom: "1px solid #e5e7eb", color: "#374151" }}>NOTAS ADICIONALES</h3>
              <p style={{ fontSize: "14px", margin: 0, whiteSpace: "pre-wrap" }}>{recibo.nota}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", fontSize: "12px", color: "#6b7280", marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
            <p>Este recibo constituye prueba válida de pago del canon de arrendamiento correspondiente al período especificado.</p>
            <p style={{ marginTop: "4px" }}>Fecha de expedición: {new Date().toLocaleDateString("es-CO")}</p>
          </div>

          {/* Firmas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", marginTop: "64px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #1f2937", paddingTop: "8px", marginBottom: "4px" }}>{recibo.arrendador_nombre || ""}</div>
              <p style={{ fontSize: "14px", margin: 0, color: "#6b7280" }}>ARRENDATARIO (PAGADOR)</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #1f2937", paddingTop: "8px", marginBottom: "4px" }}>{recibo.propietario_nombre || ""}</div>
              <p style={{ fontSize: "14px", margin: 0, color: "#6b7280" }}>PROPIETARIO (RECEPTOR)</p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS para impresión */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            /* Ocultar los controles */
            .no-print {
              display: none !important;
            }

            /* Reset básico */
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            /* Mostrar SOLO el recibo */
            body > * {
              display: none !important;
            }

            #recibo-contenido {
              display: block !important;
              margin: 0 !important;
              padding: 20px !important;
              min-height: auto !important;
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
    </>
  )
}
