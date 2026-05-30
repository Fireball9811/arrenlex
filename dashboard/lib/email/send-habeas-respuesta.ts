import { getResendClient, getEmailFrom } from "@/lib/email/transport"

const HABEAS_REPLY_TO = process.env.HABEAS_REPLY_TO?.trim() || "habeasdata@arrenlex.com"

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Remitente visible para Habeas Data. Si no está verificado en Resend, usar EMAIL_FROM + replyTo.
 */
export function getHabeasEmailFromHeader(): string {
  const from = process.env.HABEAS_EMAIL_FROM?.trim()
  if (from) return from
  return getEmailFrom()
}

/**
 * Envía la respuesta Habeas Data por Resend (servidor).
 * Si HABEAS_EMAIL_FROM no está definido, se usa getEmailFrom() y replyTo = habeasdata@arrenlex.com.
 */
export async function sendHabeasRespuestaEmail(params: {
  to: string
  subject: string
  textBody: string
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Servicio de email no configurado" }
  }

  const from = getHabeasEmailFromHeader()
  const useReplyTo = !process.env.HABEAS_EMAIL_FROM?.trim()

  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">${escapeHtml(
    params.textBody
  ).replace(/\r\n/g, "\n").replace(/\n/g, "<br/>")}</div>`

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html,
      ...(useReplyTo ? { replyTo: HABEAS_REPLY_TO } : {}),
    })
    if (error) {
      console.error("[send-habeas-respuesta] Resend:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    console.error("[send-habeas-respuesta]", err)
    return { success: false, error: msg }
  }
}

export function buildMailtoHabeasRespuesta(to: string, subject: string, body: string): string {
  const params = new URLSearchParams()
  params.set("subject", subject)
  params.set("body", body)
  return `mailto:${to}?${params.toString()}`
}
