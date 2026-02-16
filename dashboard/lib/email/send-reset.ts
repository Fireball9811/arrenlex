import { getResendClient } from "./transport"

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Arrenlex"
const FROM_EMAIL =
  process.env.EMAIL_FROM ?? "Arrenlex <onboarding@resend.dev>"

export type SendResetEmailParams = {
  to: string
  resetLink: string
  expiresMinutes?: number
}

/**
 * Envía email con link único para restablecer contraseña.
 * Usa Resend (API). No requiere contraseña de Microsoft ni Gmail.
 */
export async function sendPasswordResetEmail({
  to,
  resetLink,
  expiresMinutes = 15,
}: SendResetEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Servicio de email no configurado" }
  }

  const subject = `Restablecer contraseña - ${SITE_NAME}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Restablecer tu contraseña</h1>
  <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
  <p><a href="${resetLink}" style="display: inline-block; background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Restablecer contraseña</a></p>
  <p style="font-size: 0.875rem; color: #666;">Este enlace expira en ${expiresMinutes} minutos. Si no solicitaste este cambio, puedes ignorar este correo.</p>
  <p style="font-size: 0.875rem; color: #666;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
  <p style="font-size: 0.75rem; word-break: break-all;">${resetLink}</p>
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
      console.error("[send-reset] Resend error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    console.error("[send-reset] Error enviando email:", err)
    return { success: false, error: msg }
  }
}
