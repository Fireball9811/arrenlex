import { getResendClient, getEmailFrom } from "./transport"

const TO_CEO = "ceo@arrenlex.com"

export type SendMantenimientoParams = {
  nombreCompleto: string
  detalle: string
  desdeCuando: string
  propiedadRef?: string
  // Nuevos parámetros para envío múltiple
  propietarioEmail?: string
  propietarioNombre?: string
  mantenimientoEmail?: string
  mantenimientoNombre?: string
  admins?: Array<{ email: string; nombre?: string }>
}

/**
 * Envía email a múltiples destinatarios sobre una solicitud de mantenimiento:
 * - CEO (siempre)
 * - Propietario de la propiedad (si se proporciona)
 * - Usuario con perfil maintenance_special (si se proporciona)
 * - Administradores del sistema (si se proporcionan)
 * Usa Resend API para el envío.
 */
export async function sendMantenimientoEmail(
  params: SendMantenimientoParams
): Promise<{ success: boolean; error?: string; sentTo?: string[] }> {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Servicio de email no configurado" }
  }

  const { nombreCompleto, detalle, desdeCuando, propiedadRef, propietarioEmail, propietarioNombre, mantenimientoEmail, mantenimientoNombre, admins } = params
  const from = getEmailFrom()

  // Lista de destinatarios a los que se les envió el correo
  const sentTo: string[] = []
  const errors: string[] = []

  // Función para enviar email a un destinatario
  const sendEmail = async (to: string, customSubject?: string, customHtml?: string) => {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject: customSubject || "Mantenimiento",
        html: customHtml || generateHtml(nombreCompleto, propiedadRef, detalle, desdeCuando)
      })
      if (error) {
        console.error(`[send-mantenimiento] Error enviando email a ${to}:`, error)
        errors.push(`${to}: ${error.message}`)
        return false
      }
      console.log(`[send-mantenimiento] Email enviado a ${to}:`, data?.id)
      sentTo.push(to)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      console.error(`[send-mantenimiento] Error enviando email a ${to}:`, err)
      errors.push(`${to}: ${msg}`)
      return false
    }
  }

  // 1. Enviar al CEO (siempre)
  await sendEmail(TO_CEO)

  // 2. Enviar al propietario de la propiedad
  if (propietarioEmail) {
    const htmlPropietario = generateHtmlForPropietario(nombreCompleto, propiedadRef, detalle, desdeCuando, propietarioNombre)
    await sendEmail(propietarioEmail, "Nueva solicitud de mantenimiento en tu propiedad", htmlPropietario)
  }

  // 3. Enviar al encargado de mantenimiento (maintenance_special)
  if (mantenimientoEmail) {
    const htmlMantenimiento = generateHtmlForMantenimiento(nombreCompleto, propiedadRef, detalle, desdeCuando, mantenimientoNombre)
    await sendEmail(mantenimientoEmail, "Nueva solicitud de mantenimiento asignada", htmlMantenimiento)
  }

  // 4. Enviar a los administradores
  if (admins && admins.length > 0) {
    const htmlAdmin = generateHtmlForAdmin(nombreCompleto, propiedadRef, detalle, desdeCuando)
    for (const admin of admins) {
      await sendEmail(admin.email, "Nueva solicitud de mantenimiento - Notificación Admin", htmlAdmin)
    }
  }

  const success = sentTo.length > 0
  return {
    success,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    sentTo
  }
}

// HTML genérico para CEO
function generateHtml(nombreCompleto: string, propiedadRef: string | undefined, detalle: string, desdeCuando: string): string {
  return `
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
}

// HTML para el propietario
function generateHtmlForPropietario(nombreCompleto: string, propiedadRef: string | undefined, detalle: string, desdeCuando: string, propietarioNombre?: string): string {
  const saludo = propietarioNombre ? `Hola ${escapeHtml(propietarioNombre)}` : "Hola"
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Nueva solicitud de mantenimiento en tu propiedad</h1>
  <p>${saludo}, se ha recibido una solicitud de mantenimiento para una de tus propiedades.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Propiedad:</strong> ${escapeHtml(propiedadRef ?? "—")}</p>
    <p style="margin: 0 0 8px 0;"><strong>Reportado por:</strong> ${escapeHtml(nombreCompleto)}</p>
    <p style="margin: 0 0 8px 0;"><strong>Detalle del problema:</strong></p>
    <p style="margin: 0 0 8px 0; white-space: pre-wrap;">${escapeHtml(detalle)}</p>
    <p style="margin: 0;"><strong>Desde cuándo está el problema:</strong> ${escapeHtml(desdeCuando)}</p>
  </div>
  <p>Un especialista de mantenimiento revisará esta solicitud a la brevedad.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.75rem; color: #999;">Arrenlex - Mantenimiento</p>
</body>
</html>
`.trim()
}

// HTML para el encargado de mantenimiento
function generateHtmlForMantenimiento(nombreCompleto: string, propiedadRef: string | undefined, detalle: string, desdeCuando: string, mantenimientoNombre?: string): string {
  const saludo = mantenimientoNombre ? `Hola ${escapeHtml(mantenimientoNombre)}` : "Hola"
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Nueva solicitud de mantenimiento asignada</h1>
  <p>${saludo}, se te ha asignado una nueva solicitud de mantenimiento.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Propiedad:</strong> ${escapeHtml(propiedadRef ?? "—")}</p>
    <p style="margin: 0 0 8px 0;"><strong>Reportado por:</strong> ${escapeHtml(nombreCompleto)}</p>
    <p style="margin: 0 0 8px 0;"><strong>Detalle del problema:</strong></p>
    <p style="margin: 0 0 8px 0; white-space: pre-wrap;">${escapeHtml(detalle)}</p>
    <p style="margin: 0;"><strong>Desde cuándo está el problema:</strong> ${escapeHtml(desdeCuando)}</p>
  </div>
  <p>Por favor revisa esta solicitud y coordina la visita para realizar el mantenimiento necesario.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.75rem; color: #999;">Arrenlex - Mantenimiento</p>
</body>
</html>
`.trim()
}

// HTML para administradores
function generateHtmlForAdmin(nombreCompleto: string, propiedadRef: string | undefined, detalle: string, desdeCuando: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Nueva solicitud de mantenimiento - Notificación Admin</h1>
  <p>Se ha creado una nueva solicitud de mantenimiento en el sistema.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Propiedad:</strong> ${escapeHtml(propiedadRef ?? "—")}</p>
    <p style="margin: 0 0 8px 0;"><strong>Reportado por:</strong> ${escapeHtml(nombreCompleto)}</p>
    <p style="margin: 0 0 8px 0;"><strong>Detalle del problema:</strong></p>
    <p style="margin: 0 0 8px 0; white-space: pre-wrap;">${escapeHtml(detalle)}</p>
    <p style="margin: 0;"><strong>Desde cuándo está el problema:</strong> ${escapeHtml(desdeCuando)}</p>
  </div>
  <p>La solicitud ha sido asignada automáticamente al especialista de mantenimiento correspondiente.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.75rem; color: #999;">Arrenlex - Mantenimiento</p>
</body>
</html>
`.trim()
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
