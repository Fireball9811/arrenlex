import { getSmtpTransporter, getEmailFrom } from "./transport"

const TO_CEO = "ceo@arrenlex.com"

export type SendSolicitudVisitaParams = {
  nombreCompleto: string
  celular: string
  email: string
  propiedadId: string
  propiedadRef?: string
  nota?: string | null
}

/**
 * Envía email a ceo@arrenlex.com con asunto "Solicitar Visita" y detalles del mensaje.
 * Usa SMTP (Microsoft 365) con credenciales desde Supabase.
 */
export async function sendSolicitudVisitaEmail(
  params: SendSolicitudVisitaParams
): Promise<{ success: boolean; error?: string }> {
  const transporter = await getSmtpTransporter()
  if (!transporter) {
    return { success: false, error: "Servicio de email no configurado" }
  }

  const { nombreCompleto, celular, email, propiedadId, propiedadRef, nota } = params
  const from = getEmailFrom()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const linkPropiedad = baseUrl ? `${baseUrl}/catalogo/propiedades/${propiedadId}` : ""

  const subject = "Solicitar Visita"
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Solicitud de visita a propiedad</h1>
  <p>Alguien ha solicitado una visita desde el catálogo.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Nombre completo:</strong> ${escapeHtml(nombreCompleto)}</p>
    <p style="margin: 0 0 8px 0;"><strong>Celular:</strong> ${escapeHtml(celular)}</p>
    <p style="margin: 0 0 8px 0;"><strong>Correo electrónico:</strong> ${escapeHtml(email)}</p>
    <p style="margin: 0 0 8px 0;"><strong>Referencia propiedad:</strong> ${escapeHtml(propiedadRef || propiedadId)}</p>
    ${nota ? `<p style="margin: 0;"><strong>Nota:</strong> ${escapeHtml(nota)}</p>` : ""}
  </div>
  ${linkPropiedad ? `<p><a href="${linkPropiedad}" style="color: #2563eb;">Ver ficha de la propiedad</a></p>` : ""}
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.75rem; color: #999;">Arrenlex - Solicitud de visita</p>
</body>
</html>
`.trim()

  try {
    const info = await transporter.sendMail({ from, to: TO_CEO, subject, html })
    console.log("[send-solicitud-visita] Email enviado:", info.messageId)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    console.error("[send-solicitud-visita] Error enviando email:", err)
    return { success: false, error: msg }
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (c) => map[c] ?? c)
}
