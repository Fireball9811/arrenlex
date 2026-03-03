/**
 * Envío de mensajes de WhatsApp vía Meta Cloud API (WhatsApp Business Platform).
 * Requiere las variables de entorno:
 *   WHATSAPP_PHONE_NUMBER_ID  — ID del número de teléfono en Meta
 *   WHATSAPP_ACCESS_TOKEN     — Token de acceso de la app de Meta
 *   WHATSAPP_CEO_NUMBER       — Número del CEO con código de país, sin +  (ej. 573001234567)
 */

const META_API_VERSION = "v19.0"
const META_BASE_URL = "https://graph.facebook.com"

export type SendWhatsAppParams = {
  to: string     // Número destino con código de país, sin + (ej. 573001234567)
  text: string   // Mensaje de texto plano
}

export type SendWhatsAppResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envía un mensaje de texto plano via Meta WhatsApp Cloud API.
 */
export async function sendWhatsApp(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn("[whatsapp] Variables WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN no configuradas")
    return { success: false, error: "WhatsApp no configurado" }
  }

  const url = `${META_BASE_URL}/${META_API_VERSION}/${phoneNumberId}/messages`

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.to,
    type: "text",
    text: {
      preview_url: false,
      body: params.text,
    },
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMsg = data?.error?.message ?? `HTTP ${response.status}`
      console.error("[whatsapp] Error al enviar mensaje:", errorMsg)
      return { success: false, error: errorMsg }
    }

    const messageId = data?.messages?.[0]?.id
    console.log("[whatsapp] Mensaje enviado:", messageId)
    return { success: true, messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    console.error("[whatsapp] Excepción al enviar mensaje:", err)
    return { success: false, error: msg }
  }
}

/**
 * Envía un mensaje de WhatsApp al CEO usando el número configurado en WHATSAPP_CEO_NUMBER.
 */
export async function sendWhatsAppCEO(text: string): Promise<SendWhatsAppResult> {
  const ceoNumber = process.env.WHATSAPP_CEO_NUMBER
  if (!ceoNumber) {
    console.warn("[whatsapp] Variable WHATSAPP_CEO_NUMBER no configurada")
    return { success: false, error: "Número del CEO no configurado" }
  }
  return sendWhatsApp({ to: ceoNumber, text })
}

/**
 * Construye el texto del mensaje de WhatsApp para una nueva aplicación.
 */
export function buildAplicacionWhatsAppText(params: {
  propiedadRef: string
  canonArriendo: number | null
  nombre: string
  cedula: string
  telefono: string | null
  ingresos: number | null
  personas: number | null
  ninos: number | null
  mascotas: number | null
  negocio: string | null
}): string {
  const cop = (val: number | null) => {
    if (!val) return "—"
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const v = (val: string | number | null | undefined) =>
    val !== null && val !== undefined && val !== "" ? String(val) : "—"

  const lines = [
    "📋 *Nueva aplicación de arrendamiento*",
    "",
    `🏠 Propiedad: ${params.propiedadRef}${params.canonArriendo ? ` · Canon: ${cop(params.canonArriendo)}/mes` : ""}`,
    "",
    `👤 Candidato: ${params.nombre}`,
    `🪪 Cédula: ${v(params.cedula)}`,
    `📞 Teléfono: ${v(params.telefono)}`,
    `💰 Ingresos grupales: ${cop(params.ingresos)}`,
    "",
    `👥 Adultos: ${v(params.personas)}  ·  Niños: ${v(params.ninos)}  ·  Mascotas: ${v(params.mascotas)}`,
    `🏢 ¿Para negocio?: ${v(params.negocio)}`,
    "",
    "Revisa el detalle completo en el panel de Arrenlex.",
  ]

  return lines.join("\n")
}
