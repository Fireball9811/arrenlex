import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Obtener email personalizado del body
  let customEmail = null
  try {
    const body = await request.json()
    customEmail = body.email
  } catch {
    // Si no hay body, continuar sin email personalizado
  }

  const admin = createAdminClient()

  // Obtener el recibo con información completa
  const { data: recibo, error } = await admin
    .from("recibos_pago")
    .select(`
      *,
      propiedad:propiedades(direccion, ciudad, barrio)
    `)
    .eq("id", id)
    .single()

  if (error || !recibo) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }

  // Generar URL del PDF
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pdfUrl = `${baseUrl}/api/recibos-pago/${id}/pdf`

  // Generar HTML del email
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2c5282; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f7fafc; padding: 30px 20px; border: 1px solid #e2e8f0; }
    .details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 1px solid #e2e8f0; }
    .details p { margin: 5px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #2c5282; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #2c5282; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Recibo de Pago Generado</h1>
    </div>
    <div class="content">
      <h2>Hola, ${recibo.arrendador_nombre || 'Arrendatario'}</h2>
      <p>Se ha generado un nuevo recibo de pago para el inmueble que estás arrendando.</p>

      <div class="details">
        <h3>Detalles del Recibo</h3>
        <p><strong>Número:</strong> ${recibo.numero_recibo || 'N/A'}</p>
        <p><strong>Fecha:</strong> ${new Date(recibo.fecha_recibo).toLocaleDateString('es-CO')}</p>
        <p><strong>Inmueble:</strong> ${recibo.propiedad?.direccion || 'N/A'}, ${recibo.propiedad?.ciudad || 'N/A'}</p>
        <p><strong>Período:</strong> ${recibo.fecha_inicio_periodo ? new Date(recibo.fecha_inicio_periodo).toLocaleDateString('es-CO') : 'N/A'} - ${recibo.fecha_fin_periodo ? new Date(recibo.fecha_fin_periodo).toLocaleDateString('es-CO') : 'N/A'}</p>
      </div>

      <div class="amount">
        $ ${Number(recibo.valor_arriendo || 0).toLocaleString('es-CO')}
      </div>

      <div style="text-align: center;">
        <p>Puedes ver y descargar el PDF del recibo haciendo clic en el siguiente botón:</p>
        <a href="${pdfUrl}" class="button">Ver Recibo en PDF</a>
      </div>

      ${recibo.nota ? `
      <div class="details">
        <h3>Notas Adicionales</h3>
        <p>${recibo.nota}</p>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>Este es un correo automático. Por favor no respondas a este mensaje.</p>
      <p>Arrenlex - Sistema de Gestión de Arrendamiento</p>
    </div>
  </div>
</body>
</html>
  `

  try {
    // Usar email personalizado si se proporcionó, si no buscar el del arrendatario
    let toEmail = customEmail

    if (!toEmail) {
      // Obtener email del arrendatario desde la tabla arrendatarios
      const { data: arrendatario } = await admin
        .from("arrendatarios")
        .select("email")
        .eq("nombre", recibo.arrendador_nombre)
        .single()

      toEmail = arrendatario?.email
    }

    // Si aún no hay email, usar uno por defecto
    if (!toEmail) {
      return NextResponse.json({ error: "No se pudo determinar el email del destinatario. Por favor ingrésalo manualmente." }, { status: 400 })
    }

    // Enviar email usando Resend
    const { data, error: emailError } = await resend.emails.send({
      from: 'Arrenlex <noreply@arrenlex.com>',
      to: toEmail,
      subject: `Recibo de Pago - ${recibo.numero_recibo || 'N/A'}`,
      html: emailHtml,
    })

    if (emailError) {
      console.error("Error enviando email:", emailError)
      return NextResponse.json({ error: "Error al enviar el email" }, { status: 500 })
    }

    // Marcar el recibo como enviado
    await admin
      .from("recibos_pago")
      .update({ enviado: true, fecha_envio: new Date().toISOString() })
      .eq("id", id)

    return NextResponse.json({ success: true, message: "Email enviado correctamente", data })
  } catch (err: any) {
    console.error("Error en endpoint de envío:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
