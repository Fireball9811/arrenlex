import { getResendClient } from "./transport"

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Arrenlex"
const FROM_EMAIL =
  process.env.EMAIL_FROM ?? "Arrenlex <onboarding@resend.dev>"

export type SendInvitationEmailParams = {
  to: string
  tempPassword: string
  loginUrl: string
  expiresInDays: number
}

/**
 * Envía email con credenciales de invitación (email y contraseña temporal).
 * El usuario debe entrar por login y será redirigido a cambio de contraseña.
 * Usa Resend (API). No requiere contraseña de Microsoft ni Gmail.
 */
export async function sendInvitationEmail({
  to,
  tempPassword,
  loginUrl,
  expiresInDays,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Servicio de email no configurado" }
  }

  const subject = `Invitación a ${SITE_NAME} - Tus credenciales de acceso`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Bienvenido a ${SITE_NAME}</h1>
  <p>Has sido invitado a acceder a la plataforma. Aquí tienes tus credenciales temporales:</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Correo:</strong> ${to}</p>
    <p style="margin: 0;"><strong>Contraseña temporal:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
  </div>
  <p><a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Ir a inicio de sesión</a></p>
  <p style="font-size: 0.875rem; color: #666;">Esta contraseña temporal es válida por ${expiresInDays} días. Al entrar se te pedirá crear una nueva contraseña.</p>
  <p style="font-size: 0.875rem; color: #666;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
  <p style="font-size: 0.75rem; word-break: break-all;">${loginUrl}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.75rem; color: #999;">${SITE_NAME}</p>
</body>
</html>
`.trim()

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })
    if (error) {
      console.error("[send-invitation] Resend error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    console.error("[send-invitation] Error enviando email:", err)
    return { success: false, error: msg }
  }
}
