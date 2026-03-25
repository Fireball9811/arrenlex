import { getResendClient, getEmailFrom } from "./transport"

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Arrenlex"

export type DestinatarioNotificacion = {
  email: string
  nombre: string
}

export type ParamsNotificacionArriendo = {
  destinatarios: DestinatarioNotificacion[]
  arrendatarioNombre: string
  propiedadDireccion: string
  fechaFin: string
}

function primerNombre(nombre: string): string {
  return nombre.split(" ")[0]
}

function htmlBase(contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a;background:#f8fafc;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af,#1d4ed8);padding:28px 32px 20px;text-align:center;">
              <h1 style="margin:0;font-size:1.25rem;font-weight:700;color:#ffffff;">${SITE_NAME}</h1>
              <p style="margin:6px 0 0;font-size:0.875rem;color:#bfdbfe;">Gestión de Arrendamientos</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${contenido}
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:0.8rem;color:#94a3b8;">Con gusto,<br><strong style="color:#475569;">El equipo de ${SITE_NAME}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function infoBanner(propiedadDireccion: string, fechaFin: string): string {
  return `
  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0;">
    <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em;">Propiedad</p>
    <p style="margin:0;font-size:0.9rem;font-weight:600;color:#0c4a6e;">${propiedadDireccion}</p>
    <p style="margin:4px 0 0;font-size:0.8rem;color:#0369a1;">Vencimiento del contrato: <strong>${fechaFin}</strong></p>
  </div>`
}

async function enviarADestinatarios(
  asunto: string,
  html: (nombre: string) => string,
  destinatarios: DestinatarioNotificacion[]
): Promise<{ success: boolean; errores: string[] }> {
  const resend = getResendClient()
  if (!resend) return { success: false, errores: ["Servicio de email no configurado"] }

  const from = getEmailFrom()
  const errores: string[] = []

  await Promise.all(
    destinatarios.map(async ({ email, nombre }) => {
      try {
        const { error } = await resend.emails.send({
          from,
          to: email,
          subject: asunto,
          html: html(nombre),
        })
        if (error) {
          console.error(`[notificacion-arriendo] Error enviando a ${email}:`, error)
          errores.push(`${email}: ${error.message}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido"
        console.error(`[notificacion-arriendo] Excepción enviando a ${email}:`, err)
        errores.push(`${email}: ${msg}`)
      }
    })
  )

  return { success: errores.length === 0, errores }
}

export async function sendRecordatorio5Dias({
  destinatarios,
  arrendatarioNombre,
  propiedadDireccion,
  fechaFin,
}: ParamsNotificacionArriendo) {
  const asunto = `Recordatorio: vencimiento de contrato en 5 días - ${propiedadDireccion}`

  return enviarADestinatarios(
    asunto,
    (nombre) =>
      htmlBase(`
        <p style="margin:0 0 16px;font-size:1rem;">Estimado/a <strong>${primerNombre(nombre)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:0.95rem;color:#374151;">
          Espero que se encuentre muy bien.
        </p>
        <p style="margin:0 0 16px;font-size:0.95rem;color:#374151;">
          Quería recordarle de manera amable que en <strong>5 días</strong> se cumple el plazo del arrendamiento 
          según lo establecido en el contrato del señor/señora <strong>${arrendatarioNombre}</strong>. 
          Este mensaje es únicamente como recordatorio.
        </p>
        ${infoBanner(propiedadDireccion, fechaFin)}
      `),
    destinatarios
  )
}

export async function sendMora1Dia({
  destinatarios,
  arrendatarioNombre,
  propiedadDireccion,
  fechaFin,
}: ParamsNotificacionArriendo) {
  const asunto = `Aviso: plazo de contrato cumplido - ${propiedadDireccion}`

  return enviarADestinatarios(
    asunto,
    (nombre) =>
      htmlBase(`
        <p style="margin:0 0 16px;font-size:1rem;">Estimado/a <strong>${primerNombre(nombre)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:0.95rem;color:#374151;">
          Espero que se encuentre muy bien.
        </p>
        <p style="margin:0 0 16px;font-size:0.95rem;color:#374151;">
          Le escribo para informarle que el día de ayer se cumplió el plazo establecido en el contrato 
          de arrendamiento del señor/señora <strong>${arrendatarioNombre}</strong>. Quedamos atentos a su 
          comunicación para definir cómo proceder y coordinar lo que corresponda.
        </p>
        ${infoBanner(propiedadDireccion, fechaFin)}
      `),
    destinatarios
  )
}

export async function sendSeguimiento3Dias({
  destinatarios,
  arrendatarioNombre,
  propiedadDireccion,
  fechaFin,
}: ParamsNotificacionArriendo) {
  const asunto = `Seguimiento: contrato vencido sin confirmación - ${propiedadDireccion}`

  return enviarADestinatarios(
    asunto,
    (nombre) =>
      htmlBase(`
        <p style="margin:0 0 16px;font-size:1rem;">Estimado/a <strong>${primerNombre(nombre)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:0.95rem;color:#374151;">
          Espero que se encuentre bien.
        </p>
        <p style="margin:0 0 16px;font-size:0.95rem;color:#374151;">
          Le escribo para darle seguimiento a nuestro mensaje anterior, ya que han transcurrido 3 días 
          desde el cumplimiento del plazo del contrato de arrendamiento del señor/señora 
          <strong>${arrendatarioNombre}</strong> y aún no hemos recibido su confirmación.
        </p>
        <p style="margin:0 0 16px;font-size:0.95rem;color:#374151;">
          Le agradeceríamos mucho que pueda comunicarse con nosotros a la brevedad para poder coordinar 
          lo correspondiente y mantener todo en orden.
        </p>
        <p style="margin:0 0 4px;font-size:0.95rem;color:#374151;">
          Quedamos atentos a su pronta respuesta.
        </p>
        ${infoBanner(propiedadDireccion, fechaFin)}
      `),
    destinatarios
  )
}
