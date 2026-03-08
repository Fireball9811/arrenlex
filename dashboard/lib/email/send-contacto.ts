import { getResendClient, getEmailFrom } from "./transport"

const TO_CEO = "ceo@arrenlex.com"

export type SendContactoParams = {
  nombre: string
  celular: string
  email: string
  tipo: "propietario" | "arrendatario"
}

/**
 * Envía email a ceo@arrenlex.com cuando alguien llena el formulario
 * de "Contáctenos" desde la landing page.
 */
export async function sendContactoEmail(
  params: SendContactoParams
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Servicio de email no configurado" }
  }

  const { nombre, celular, email, tipo } = params
  const from = getEmailFrom()
  const tipoLabel = tipo === "propietario" ? "Propietario" : "Arrendatario"
  const tipoColor = tipo === "propietario" ? "#0e7490" : "#7c3aed"
  const subject = `Nuevo contacto desde la web — ${tipoLabel}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 0; background: #f8fafc;">

  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0e7490 100%); padding: 32px 24px; text-align: center;">
    <h1 style="color: #fff; font-size: 1.4rem; font-weight: 700; margin: 0; letter-spacing: 0.05em;">
      ARRENLEX
    </h1>
    <p style="color: #67e8f9; font-size: 0.8rem; margin: 4px 0 0; letter-spacing: 0.15em; text-transform: uppercase;">
      Gestión de Arriendos
    </p>
  </div>

  <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 28px 24px;">
    <h2 style="font-size: 1.1rem; color: #0f172a; margin: 0 0 6px;">
      Nuevo contacto desde la landing page
    </h2>
    <p style="color: #64748b; font-size: 0.875rem; margin: 0 0 20px;">
      Alguien ha llenado el formulario de "Contáctenos". Aquí están sus datos:
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${tipoColor}; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-size: 0.85rem; color: #64748b; width: 120px; font-weight: 600;">Tipo</td>
          <td style="padding: 6px 0; font-size: 0.875rem; color: #0f172a;">
            <span style="background: ${tipoColor}20; color: ${tipoColor}; padding: 2px 10px; border-radius: 9999px; font-weight: 600; font-size: 0.8rem;">
              ${escapeHtml(tipoLabel)}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 0.85rem; color: #64748b; font-weight: 600;">Nombre</td>
          <td style="padding: 6px 0; font-size: 0.875rem; color: #0f172a;">${escapeHtml(nombre)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 0.85rem; color: #64748b; font-weight: 600;">Celular</td>
          <td style="padding: 6px 0; font-size: 0.875rem; color: #0f172a;">${escapeHtml(celular)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 0.85rem; color: #64748b; font-weight: 600;">Correo</td>
          <td style="padding: 6px 0; font-size: 0.875rem; color: #0f172a;">
            <a href="mailto:${escapeHtml(email)}" style="color: #0e7490;">${escapeHtml(email)}</a>
          </td>
        </tr>
      </table>
    </div>

    <p style="color: #94a3b8; font-size: 0.8rem; margin: 0;">
      Este contacto fue enviado desde el formulario público de la página de inicio de Arrenlex.
    </p>
  </div>

  <div style="background: #0f172a; padding: 16px 24px; text-align: center;">
    <p style="color: #475569; font-size: 0.7rem; margin: 0;">
      Arrenlex · Gestión de Arriendos · ceo@arrenlex.com
    </p>
  </div>

</body>
</html>
`.trim()

  try {
    const { data, error } = await resend.emails.send({ from, to: TO_CEO, subject, html })
    if (error) {
      console.error("[send-contacto] Error enviando email:", error)
      return { success: false, error: error.message }
    }
    console.log("[send-contacto] Email enviado:", data?.id)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    console.error("[send-contacto] Error:", err)
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
