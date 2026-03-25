import { getResendClient, getEmailFrom } from "./transport"

const TO_CEO = "ceo@arrenlex.com"

export type SendAplicacionParams = {
  // Propiedad
  propiedadId: string
  propiedadRef: string        // "Bogotá · 65 m²"
  canonArriendo: number | null
  // Arrendatario
  nombre: string
  email: string
  cedula: string
  fechaExpedicionCedula: string | null
  telefono: string | null
  // Laboral arrendatario
  empresaArrendatario: string | null
  antiguedadMeses: number | null
  salario: number | null
  ingresos: number | null
  // Coarrendatario (todos opcionales)
  nombreCoarrendatario: string | null
  cedulaCoarrendatario: string | null
  fechaExpedicionCedulaCoarrendatario: string | null
  empresaCoarrendatario: string | null
  antiguedadMeses2: number | null
  salario2: number | null
  telefonoCoarrendatario: string | null
  // Hogar
  personas: number | null
  ninos: number | null
  mascotas: number | null
  personasTrabajan: number | null
  negocio: string | null
  // Propietario
  propietarioEmail?: string
  propietarioNombre?: string
}

export async function sendAplicacionEmail(
  params: SendAplicacionParams
): Promise<{ success: boolean; error?: string; sentTo?: string[] }> {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Servicio de email no configurado" }
  }

  const from = getEmailFrom()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const sentTo: string[] = []
  const errors: string[] = []

  const sendTo = async (to: string, subject: string, html: string) => {
    try {
      const { data, error } = await resend.emails.send({ from, to, subject, html })
      if (error) {
        console.error(`[send-aplicacion] Error enviando a ${to}:`, error)
        errors.push(`${to}: ${error.message}`)
        return false
      }
      console.log(`[send-aplicacion] Email enviado a ${to}:`, data?.id)
      sentTo.push(to)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      console.error(`[send-aplicacion] Error enviando a ${to}:`, err)
      errors.push(`${to}: ${msg}`)
      return false
    }
  }

  // 1. Email al CEO — detalle completo
  await sendTo(
    TO_CEO,
    `Nueva aplicación de arrendamiento — ${params.propiedadRef}`,
    buildHtmlCEO(params, baseUrl)
  )

  // 2. Email al propietario — si se proporcionó
  if (params.propietarioEmail) {
    await sendTo(
      params.propietarioEmail,
      `Nueva aplicación para tu propiedad — ${params.propiedadRef}`,
      buildHtmlPropietario(params, baseUrl)
    )
  }

  return {
    success: sentTo.length > 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    sentTo,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cop(val: number | null): string {
  if (val === null || val === undefined) return "—"
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

function val(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—"
  return String(v)
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

const STYLE = {
  body: "font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 0;",
  header: "background: #0e7490; padding: 28px 32px; border-radius: 8px 8px 0 0;",
  headerTitle: "margin: 0; font-size: 1.25rem; color: #fff; font-weight: 700;",
  headerSub: "margin: 4px 0 0; font-size: 0.875rem; color: #a5f3fc;",
  body2: "padding: 24px 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none;",
  section: "margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;",
  sectionHead: "background: #f0f9ff; padding: 10px 16px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; color: #0e7490; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;",
  sectionBody: "padding: 14px 16px;",
  row: "display: flex; gap: 8px; margin-bottom: 6px; font-size: 0.875rem;",
  label: "color: #6b7280; min-width: 140px; flex-shrink: 0;",
  value: "color: #111827; font-weight: 500;",
  footer: "padding: 16px 32px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 0.75rem; color: #9ca3af; text-align: center;",
}

function row(label: string, value: string | null | undefined): string {
  return `
    <tr>
      <td style="padding: 5px 12px 5px 0; font-size: 0.875rem; color: #6b7280; white-space: nowrap; vertical-align: top;">${escapeHtml(label)}</td>
      <td style="padding: 5px 0; font-size: 0.875rem; color: #111827; font-weight: 500; vertical-align: top;">${escapeHtml(val(value))}</td>
    </tr>`
}

function section(title: string, rows: string): string {
  return `
  <div style="${STYLE.section}">
    <div style="${STYLE.sectionHead}">${escapeHtml(title)}</div>
    <div style="${STYLE.sectionBody}">
      <table style="border-collapse: collapse; width: 100%;">
        ${rows}
      </table>
    </div>
  </div>`
}

function buildBody(params: SendAplicacionParams, baseUrl: string): string {
  const tieneCoarrendatario =
    !!params.nombreCoarrendatario || !!params.cedulaCoarrendatario

  const secArrendatario = section("1. Arrendatario", [
    row("Nombre completo", params.nombre),
    row("Cédula", params.cedula),
    row("Fecha exp. cédula", params.fechaExpedicionCedula),
    row("Teléfono", params.telefono),
    row("Correo electrónico", params.email),
  ].join(""))

  const secLaboral = section("2. Situación laboral", [
    row("Empresa", params.empresaArrendatario),
    row("Antigüedad", params.antiguedadMeses !== null ? `${params.antiguedadMeses} meses` : null),
    row("Salario mensual", cop(params.salario)),
    row("Ingresos grupales", cop(params.ingresos)),
  ].join(""))

  const secCoarrendatario = tieneCoarrendatario
    ? section("3. Coarrendatario", [
        row("Nombre completo", params.nombreCoarrendatario),
        row("Cédula", params.cedulaCoarrendatario),
        row("Fecha exp. cédula", params.fechaExpedicionCedulaCoarrendatario),
        row("Empresa", params.empresaCoarrendatario),
        row("Antigüedad", params.antiguedadMeses2 !== null ? `${params.antiguedadMeses2} meses` : null),
        row("Salario mensual", cop(params.salario2)),
        row("Teléfono", params.telefonoCoarrendatario),
      ].join(""))
    : ""

  const secHogar = section(tieneCoarrendatario ? "4. Composición del hogar" : "3. Composición del hogar", [
    row("Personas adultas", val(params.personas)),
    row("Niños", val(params.ninos)),
    row("Mascotas", val(params.mascotas)),
    row("Personas que trabajan", val(params.personasTrabajan)),
    row("¿Para negocio?", params.negocio),
  ].join(""))

  const linkPanel = baseUrl
    ? `<p style="margin: 16px 0 0;"><a href="${baseUrl}/mensajes" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 0.875rem; font-weight: 600;">Ver detalle en el panel de Arrenlex</a></p>`
    : ""

  return `${secArrendatario}${secLaboral}${secCoarrendatario}${secHogar}${linkPanel}`
}

function buildHtmlCEO(params: SendAplicacionParams, baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${STYLE.body}">
  <div style="${STYLE.header}">
    <h1 style="${STYLE.headerTitle}">Nueva aplicación de arrendamiento</h1>
    <p style="${STYLE.headerSub}">${escapeHtml(params.propiedadRef)}${params.canonArriendo ? ` &nbsp;·&nbsp; Canon: ${cop(params.canonArriendo)}/mes` : ""}</p>
  </div>
  <div style="${STYLE.body2}">
    <p style="margin: 0 0 20px; font-size: 0.9375rem; color: #374151;">
      Un candidato ha diligenciado la aplicación de arrendamiento desde el catálogo.
    </p>
    ${buildBody(params, baseUrl)}
  </div>
  <div style="${STYLE.footer}">Arrenlex &mdash; Aplicación de arrendamiento</div>
</body>
</html>`
}

function buildHtmlPropietario(params: SendAplicacionParams, baseUrl: string): string {
  const saludo = params.propietarioNombre
    ? `Hola ${escapeHtml(params.propietarioNombre)},`
    : "Hola,"
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${STYLE.body}">
  <div style="${STYLE.header}">
    <h1 style="${STYLE.headerTitle}">Tienes un nuevo candidato</h1>
    <p style="${STYLE.headerSub}">${escapeHtml(params.propiedadRef)}${params.canonArriendo ? ` &nbsp;·&nbsp; Canon: ${cop(params.canonArriendo)}/mes` : ""}</p>
  </div>
  <div style="${STYLE.body2}">
    <p style="margin: 0 0 20px; font-size: 0.9375rem; color: #374151;">
      ${saludo} alguien acaba de diligenciar una aplicación de arrendamiento para tu propiedad.
      A continuación encontrarás toda la información del candidato.
    </p>
    ${buildBody(params, baseUrl)}
  </div>
  <div style="${STYLE.footer}">Arrenlex &mdash; Aplicación de arrendamiento</div>
</body>
</html>`
}
