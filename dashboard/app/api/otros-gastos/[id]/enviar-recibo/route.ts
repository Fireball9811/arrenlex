import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { Resend } from "resend"
import { fetchOtrosGastoCompleto } from "@/lib/otros-gastos/fetch-completo"
import { buildOtrosGastoReciboHtml, escapeHtml } from "@/lib/otros-gastos/recibo-html"
import { formatCalendarDateEs } from "@/lib/utils/calendar-date"

const resend = new Resend(process.env.RESEND_API_KEY)

function unwrapPropiedad<T extends Record<string, unknown>>(row: T | T[] | null | undefined): T | null {
  if (row == null) return null
  return Array.isArray(row) ? row[0] ?? null : row
}

/**
 * POST - Envía el recibo por correo electrónico (resumen + enlace al PDF/HTML imprimible).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "propietario" && role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { correo } = body as Record<string, unknown>

  if (typeof correo !== "string" || !correo.trim()) {
    return NextResponse.json({ error: "El correo es requerido" }, { status: 400 })
  }

  const admin = createAdminClient()

  const completo = await fetchOtrosGastoCompleto(admin, id)
  if (!completo) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  if (role === "propietario" && completo.user_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso para enviar este recibo" }, { status: 403 })
  }

  if (completo.estado === "cancelado") {
    return NextResponse.json({ error: "No se puede enviar un recibo cancelado" }, { status: 400 })
  }

  const propiedad = unwrapPropiedad(completo.propiedades as Record<string, unknown> | Record<string, unknown>[] | null)
  const dirProp = [propiedad?.titulo, propiedad?.direccion, propiedad?.ciudad].filter(Boolean).join(", ") || completo.propiedad_id

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arrenlex.com"
  const pdfUrl = `${baseUrl}/api/otros-gastos/${id}/pdf`

  const reciboDetalleHtml = buildOtrosGastoReciboHtml(
    {
      numero_recibo: completo.numero_recibo,
      fecha_emision: completo.fecha_emision,
      nombre_completo: completo.nombre_completo,
      cedula: completo.cedula,
      tarjeta_profesional: completo.tarjeta_profesional,
      correo_electronico: completo.correo_electronico,
      motivo_pago: completo.motivo_pago,
      descripcion_trabajo: completo.descripcion_trabajo,
      fecha_realizacion: completo.fecha_realizacion,
      valor: Number(completo.valor),
      banco: completo.banco,
      referencia_pago: completo.referencia_pago,
      estado: completo.estado,
    },
    propiedad,
    completo.propietario,
    completo.propiedad_id
  )

  const valorFmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(completo.valor))

  const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0f766e; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f7fafc; padding: 30px 20px; border: 1px solid #e2e8f0; }
    .details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 1px solid #e2e8f0; }
    .amount { font-size: 22px; font-weight: bold; color: #0f766e; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #0f766e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Recibo de otro gasto</h1>
    </div>
    <div class="content">
      <p>Hola, <strong>${escapeHtml(completo.nombre_completo)}</strong>,</p>
      <p>Adjuntamos la información del recibo de pago por servicios / proveedor registrado en Arrenlex.</p>
      <div class="details">
        <p><strong>Número:</strong> ${escapeHtml(String(completo.numero_recibo ?? "N/A"))}</p>
        <p><strong>Fecha emisión:</strong> ${escapeHtml(formatCalendarDateEs(completo.fecha_emision, "N/A"))}</p>
        <p><strong>Propiedad:</strong> ${escapeHtml(dirProp)}</p>
        <p><strong>Concepto:</strong> ${escapeHtml(completo.motivo_pago)}</p>
      </div>
      <div class="amount">${valorFmt}</div>
      <div style="text-align: center;">
        <p><strong>Ver recibo completo (imprimir o guardar como PDF desde el navegador):</strong></p>
        <a href="${pdfUrl}" class="button">Abrir recibo</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">En el navegador puedes usar <em>Imprimir → Guardar como PDF</em> para obtener el archivo PDF.</p>
    </div>
    <div class="footer">
      <p>Este es un correo automático de Arrenlex.</p>
    </div>
  </div>
</body>
</html>
`

  try {
    const emailFrom = process.env.EMAIL_FROM || "Arrenlex <ceo@arrenlex.com>"

    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: correo.trim(),
      subject: `Recibo ${completo.numero_recibo ?? id} - Otros gastos - Arrenlex`,
      html: emailHtml,
      attachments: [
        {
          filename: `Recibo_${String(completo.numero_recibo || id).replace(/[^\w.-]+/g, "_")}.html`,
          content: Buffer.from(reciboDetalleHtml, "utf-8"),
          contentType: "text/html; charset=utf-8",
        },
      ],
    })

    if (error) {
      console.error("[otros-gastos enviar-recibo]", error)
      return NextResponse.json({ error: "Error al enviar el correo" }, { status: 500 })
    }

    if (completo.estado === "pendiente") {
      await admin.from("otros_gastos").update({ estado: "emitido" }).eq("id", id)
    }

    return NextResponse.json({
      success: true,
      message: "Recibo enviado correctamente",
      data,
    })
  } catch (error) {
    console.error("[otros-gastos enviar-recibo]", error)
    return NextResponse.json({ error: "Error al enviar el correo" }, { status: 500 })
  }
}
