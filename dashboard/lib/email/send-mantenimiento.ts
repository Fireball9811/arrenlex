import { getResendClient, getEmailFrom } from "./transport"

const TO_CEO = "ceo@arrenlex.com"

export type SendMantenimientoParams = {
  nombreCompleto: string
  detalle: string
  desdeCuando: string
  propiedadRef?: string
}

/**
 * Envía email a ceo@arrenlex.com con asunto "Mantenimiento" y todo el detalle del reporte.
 * Usa Resend API para el envío.
 */
export async function sendMantenimientoEmail(
  params: SendMantenimientoParams
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Servicio de email no configurado" }
  }

  const { nombreCompleto, detalle, desdeCuando, propiedadRef } = params
  const from = getEmailFrom()

  const subject = "Mantenimiento"
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Solicitud de mantenimiento</h1>
  <p>Un inquilino ha reportado un problema en un inmueble.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Nombre completo:</strong> ${escapeHtml(nombreCompleto)}</p>
    <p style="margin: 0 0 8px 0;"><strong>Propiedad:</strong> ${escapeHtml(propiedadRef ?? "—")}</p>
    <p style="margin: 0 0 8px 0;"><strong>Detalle del problema:</strong></p>
    <p style="margin: 0 0 8px 0; white-space: pre-wrap;">${escapeHtml(detalle)}</p>
    <p style="margin: 0;"><strong>Desde cuándo está el problema:</strong> ${escapeHtml(desdeCuando)}</p>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.75rem; color: #999;">Arrenlex - Mantenimiento</p>
</body>
</html>
`.trim()

  try {
    const { data, error } = await resend.emails.send({ from, to: TO_CEO, subject, html })
    if (error) {
      console.error("[send-mantenimiento] Error enviando email:", error)
      return { success: false, error: error.message }
    }
    console.log("[send-mantenimiento] Email enviado:", data?.id)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    console.error("[send-mantenimiento] Error enviando email:", err)
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
