/** Utilidades compartidas para recibo HTML/PDF y valor en letras (otros gastos). */

import { formatCalendarDateEs } from "@/lib/utils/calendar-date"

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function numerosEnLetrasCO(numero: number): string {
  if (numero === 0) return "Cero"
  if (numero < 0) return "Menos " + numerosEnLetrasCO(-numero)
  const n = Math.floor(numero)
  if (n !== numero) return String(numero)

  const unidades = [
    "",
    "Uno",
    "Dos",
    "Tres",
    "Cuatro",
    "Cinco",
    "Seis",
    "Siete",
    "Ocho",
    "Nueve",
    "Diez",
    "Once",
    "Doce",
    "Trece",
    "Catorce",
    "Quince",
    "Dieciséis",
    "Diecisiete",
    "Dieciocho",
    "Diecinueve",
  ]
  const decenas = ["", "", "Veinte", "Treinta", "Cuarenta", "Cincuenta", "Sesenta", "Setenta", "Ochenta", "Noventa"]
  const centenas = [
    "",
    "Ciento",
    "Doscientos",
    "Trescientos",
    "Cuatrocientos",
    "Quinientos",
    "Seiscientos",
    "Setecientos",
    "Ochocientos",
    "Novecientos",
  ]

  const convertirGrupo = (num: number): string => {
    if (num === 0) return ""
    if (num < 20) return unidades[num]
    if (num < 100) {
      const dec = Math.floor(num / 10)
      const uni = num % 10
      return decenas[dec] + (uni > 0 ? " y " + unidades[uni] : "")
    }
    const cent = Math.floor(num / 100)
    const rest = num % 100
    const centPart = cent === 1 && rest === 0 ? "Cien" : centenas[cent]
    return centPart + (rest > 0 ? " " + convertirGrupo(rest) : "")
  }

  if (n < 1000) {
    return convertirGrupo(n)
  }

  const millones = Math.floor(n / 1000000)
  const restoMillones = n % 1000000
  const miles = Math.floor(restoMillones / 1000)
  const resto = restoMillones % 1000

  let resultado = ""

  if (millones > 0) {
    resultado += millones === 1 ? "Un Millón" : convertirGrupo(millones) + " Millones"
  }

  if (miles > 0) {
    if (resultado) resultado += " "
    resultado += miles === 1 ? "Mil" : convertirGrupo(miles) + " Mil"
  }

  if (resto > 0) {
    if (resultado) resultado += " "
    resultado += convertirGrupo(resto)
  }

  return resultado.trim()
}

export type OtrosGastoReciboInput = {
  numero_recibo: string | null
  fecha_emision: string
  nombre_completo: string
  cedula: string
  tarjeta_profesional?: string | null
  correo_electronico?: string | null
  motivo_pago: string
  descripcion_trabajo: string
  fecha_realizacion: string
  valor: number
  banco?: string | null
  referencia_pago?: string | null
  estado: string
}

export type PropiedadReciboInput = {
  titulo?: string | null
  direccion?: string | null
  ciudad?: string | null
} | null

export type PropietarioReciboInput = {
  email?: string | null
  nombre?: string | null
} | null

export function formatValorCOP(val: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

/** Fecha larga en español a partir de YYYY-MM-DD (sin desfase UTC). */
export function formatFechaLargaEs(dateStr: string): string {
  const cal = formatCalendarDateEs(dateStr, "")
  if (!cal) return dateStr
  const [dd, mm, y] = cal.split("/").map((s) => parseInt(s, 10))
  if (!y || !mm || !dd) return cal
  const d = new Date(y, mm - 1, dd)
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
}

/**
 * Documento HTML único para vista PDF / impresión / cuerpo detallado de correo.
 */
export function buildOtrosGastoReciboHtml(
  gasto: OtrosGastoReciboInput,
  propiedad: PropiedadReciboInput,
  propietario: PropietarioReciboInput,
  propiedadIdFallback: string
): string {
  const propAddr =
    propiedad?.titulo ||
    [propiedad?.direccion, propiedad?.ciudad].filter(Boolean).join(", ") ||
    propiedadIdFallback
  const propNombre = propietario?.nombre || propietario?.email || "Propietario"
  const estadoLabel =
    gasto.estado === "emitido" ? "EMITIDO" : gasto.estado === "cancelado" ? "CANCELADO" : "PENDIENTE"
  const valorNum = Number(gasto.valor)
  const letras = numerosEnLetrasCO(valorNum) + " pesos colombianos"

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo ${escapeHtml(gasto.numero_recibo || "")}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #111; }
    .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px; }
    .titulo { color: #0f766e; font-size: 24px; font-weight: bold; margin: 0; }
    .numero-recibo { font-size: 20px; font-weight: bold; font-family: monospace; }
    .label { color: #6b7280; font-size: 14px; margin-bottom: 5px; }
    .valor { font-size: 18px; font-weight: bold; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    .caja-gris { background: #f3f4f6; padding: 15px; border-radius: 8px; }
    .valor-grande { font-size: 32px; font-weight: bold; color: #0f766e; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
    .linea-firma { border-bottom: 1px dashed #6b7280; margin-bottom: 10px; }
    .estado { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; background: #0f766e; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="titulo">ARRENLEX</h1>
      <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Gestión de Arrendamientos</p>
    </div>
    <div style="text-align: right;">
      <p class="label">Recibo No.</p>
      <p class="numero-recibo">${escapeHtml(gasto.numero_recibo || "N/A")}</p>
      <p class="label" style="margin-top: 10px;">Fecha de emisión</p>
      <p class="valor">${escapeHtml(formatFechaLargaEs(gasto.fecha_emision))}</p>
    </div>
  </div>

  <div class="grid-2" style="margin-bottom: 30px;">
    <div>
      <p class="label">Pagado a</p>
      <p class="valor">${escapeHtml(gasto.nombre_completo)}</p>
      <p style="margin: 5px 0; font-size: 14px;">Cédula: ${escapeHtml(gasto.cedula)}</p>
      ${gasto.tarjeta_profesional ? `<p style="margin: 5px 0; font-size: 14px;">T.P.: ${escapeHtml(gasto.tarjeta_profesional)}</p>` : ""}
      ${gasto.correo_electronico ? `<p style="margin: 5px 0; font-size: 14px;">${escapeHtml(gasto.correo_electronico)}</p>` : ""}
    </div>
    <div>
      <p class="label">Emitido por</p>
      <p class="valor">${escapeHtml(propNombre)}</p>
      ${propietario?.email ? `<p style="margin: 5px 0; font-size: 14px;">${escapeHtml(propietario.email)}</p>` : ""}
    </div>
  </div>

  <div style="margin-bottom: 30px;">
    <p class="label">Por concepto de</p>
    <p class="valor" style="font-size: 20px; margin-bottom: 10px;">${escapeHtml(gasto.motivo_pago)}</p>
    <p style="color: #6b7280;">${escapeHtml(gasto.descripcion_trabajo)}</p>
  </div>

  <div class="caja-gris" style="margin-bottom: 30px;">
    <div class="grid-2">
      <div>
        <p class="label">Propiedad</p>
        <p style="font-weight: 500;">${escapeHtml(propAddr)}</p>
      </div>
      <div>
        <p class="label">Realizado el</p>
        <p style="font-weight: 500;">${escapeHtml(formatFechaLargaEs(gasto.fecha_realizacion))}</p>
      </div>
    </div>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-bottom: 30px;">
    <div style="display: flex; justify-content: space-between; align-items: end;">
      <div>
        <p class="label">Valor</p>
        <p class="valor-grande">${escapeHtml(formatValorCOP(valorNum))}</p>
      </div>
      ${
        gasto.banco
          ? `<div style="text-align: right;">
        <p class="label">Banco consignación</p>
        <p style="font-weight: 500;">${escapeHtml(gasto.banco)}</p>
        ${
          gasto.referencia_pago
            ? `<p class="label" style="margin-top: 5px;">Referencia</p><p style="font-family: monospace; font-weight: 500;">${escapeHtml(gasto.referencia_pago)}</p>`
            : ""
        }
      </div>`
          : ""
      }
    </div>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-bottom: 30px;">
    <p class="label">Valor en letras:</p>
    <p style="font-style: italic; font-weight: 500;">${escapeHtml(letras)}</p>
  </div>

  <div class="firmas">
    <div style="text-align: center;">
      <div class="linea-firma"></div>
      <p style="font-weight: 500;">Quien recibe el pago</p>
      <p style="font-size: 12px; color: #6b7280;">${escapeHtml(gasto.nombre_completo)}</p>
      <p style="font-size: 12px; color: #6b7280;">C.C. ${escapeHtml(gasto.cedula)}</p>
    </div>
    <div style="text-align: center;">
      <div class="linea-firma"></div>
      <p style="font-weight: 500;">Quien hace el pago</p>
      <p style="font-size: 12px; color: #6b7280;">${escapeHtml(propNombre)}</p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <span class="estado">Estado: ${escapeHtml(estadoLabel)}</span>
  </div>
</body>
</html>`
}
