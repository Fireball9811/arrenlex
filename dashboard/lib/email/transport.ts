import { Resend } from "resend"

let resendClient: Resend | null = null

/**
 * Cliente de Resend para enviar correos (invitaciones, reset contraseña, solicitudes).
 * Requiere: RESEND_API_KEY y EMAIL_FROM en .env.local
 * Ver RESEND_SETUP.md. No usa contraseñas de Microsoft ni Gmail.
 */
export function getResendClient(): Resend | null {
  if (resendClient) return resendClient

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY no configurado. Revisa .env.local y RESEND_SETUP.md")
    return null
  }

  resendClient = new Resend(apiKey)
  return resendClient
}
