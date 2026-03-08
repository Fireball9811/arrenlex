import { getResendClient, getEmailFrom } from "./transport"

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Arrenlex"

export type SendBienvenidaArrendatarioParams = {
  to: string
  nombre: string
  tempPassword: string
  propiedad?: {
    ciudad?: string | null
    area?: number | null
    valor_arriendo?: number | null
  }
}

function formatCOP(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

export async function sendBienvenidaArrendatario({
  to,
  nombre,
  tempPassword,
  propiedad,
}: SendBienvenidaArrendatarioParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Servicio de email no configurado" }
  }

  const from = getEmailFrom()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")
  const loginUrl = `${siteUrl}/login`
  const subject = `¡Bienvenido a ${SITE_NAME}! Tu solicitud fue aprobada`

  const primerNombre = nombre.split(" ")[0]

  const propiedadRows = propiedad
    ? [
        propiedad.ciudad ? `<tr><td style="padding:4px 8px 4px 0;color:#6b7280;font-size:0.875rem;">Ciudad</td><td style="padding:4px 0;font-size:0.875rem;font-weight:600;">${propiedad.ciudad}</td></tr>` : "",
        propiedad.area ? `<tr><td style="padding:4px 8px 4px 0;color:#6b7280;font-size:0.875rem;">Área</td><td style="padding:4px 0;font-size:0.875rem;font-weight:600;">${propiedad.area} m²</td></tr>` : "",
        propiedad.valor_arriendo ? `<tr><td style="padding:4px 8px 4px 0;color:#6b7280;font-size:0.875rem;">Canon mensual</td><td style="padding:4px 0;font-size:0.875rem;font-weight:600;">${formatCOP(propiedad.valor_arriendo)}</td></tr>` : "",
      ].filter(Boolean).join("")
    : ""

  const html = `
<!DOCTYPE html>
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

          <!-- Cabecera verde -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:2rem;">🎉</p>
              <h1 style="margin:0;font-size:1.5rem;font-weight:700;color:#ffffff;">¡Felicitaciones, ${primerNombre}!</h1>
              <p style="margin:8px 0 0;font-size:1rem;color:#bbf7d0;">Tu solicitud de arrendamiento ha sido <strong>APROBADA</strong></p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 16px;font-size:1rem;">
                Nos complace darte la bienvenida a la familia <strong>${SITE_NAME}</strong>.
                A partir de ahora podrás acceder a tu portal para consultar los detalles de tu contrato,
                tus pagos y toda la información relacionada con tu arrendamiento.
              </p>

              ${propiedadRows ? `
              <!-- Inmueble aprobado -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 24px;">
                <p style="margin:0 0 12px;font-size:0.75rem;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.05em;">Inmueble aprobado</p>
                <table cellpadding="0" cellspacing="0">
                  ${propiedadRows}
                </table>
              </div>
              ` : ""}

              <!-- Credenciales -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:0 0 24px;">
                <p style="margin:0 0 12px;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Tus credenciales de acceso</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:0.875rem;">Correo</td>
                    <td style="padding:4px 0;font-size:0.875rem;font-weight:600;">${to}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:0.875rem;">Contraseña temporal</td>
                    <td style="padding:4px 0;">
                      <code style="background:#ffffff;border:1px solid #e2e8f0;padding:3px 8px;border-radius:4px;font-size:0.9rem;font-weight:700;letter-spacing:0.05em;">${tempPassword}</code>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Botón -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${loginUrl}"
                   style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:1rem;font-weight:600;">
                  Ir a mi portal →
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:0.875rem;color:#64748b;">
                Al ingresar por primera vez, el sistema te pedirá crear una contraseña nueva y segura.
              </p>
              <p style="margin:0;font-size:0.875rem;color:#64748b;">
                Si el botón no funciona, copia este enlace en tu navegador:<br>
                <a href="${loginUrl}" style="color:#16a34a;word-break:break-all;">${loginUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Pie -->
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
</html>
`.trim()

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html })
    if (error) {
      console.error("[send-bienvenida-arrendatario] Error enviando email:", error)
      return { success: false, error: error.message }
    }
    console.log("[send-bienvenida-arrendatario] Email enviado a", to, ":", data?.id)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    console.error("[send-bienvenida-arrendatario] Error enviando email:", err)
    return { success: false, error: msg }
  }
}
