/**
 * Sistema de envío de correos usando Resend.
 * Requiere: RESEND_API_KEY en .env.local o en variables de entorno de Vercel.
 */

import { Resend } from "resend"

let resendClient: Resend | null = null

/**
 * Obtiene el cliente de Resend para enviar correos.
 * Inicializa el cliente una vez y lo cachea.
 */
export function getResendClient(): Resend | null {
  // Retornar cache si existe
  if (resendClient) return resendClient

  // Verificar que la API key esté configurada
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY no configurada")
    return null
  }

  // Crear cliente de Resend
  resendClient = new Resend(apiKey)
  return resendClient
}

/**
 * Obtiene el email remitente configurado.
 */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "Arrenlex <ceo@arrenlex.com>"
}

/**
 * Verifica si la configuración de Resend está funcionando.
 */
export async function verifyEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getResendClient()
    if (!client) {
      return { success: false, error: "No se pudo crear el cliente de Resend" }
    }

    // Resend no tiene un método verify directo como SMTP
    // Enviamos un email de prueba para verificar
    const from = getEmailFrom()
    const testTo = "ceo@arrenlex.com" // Usar el email del CEO para prueba

    await client.emails.send({
      from,
      to: testTo,
      subject: "Prueba de conexión Resend",
      html: "<p>Si recibes este correo, la configuración de Resend está funcionando correctamente.</p>",
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    return { success: false, error: message }
  }
}
