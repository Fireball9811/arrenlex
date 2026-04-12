import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
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

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // Obtener emails del body (arrendatario y propietario)
  let emailsToSend: string[] = []
  try {
    const body = await request.json()
    if (body.emails && Array.isArray(body.emails)) {
      emailsToSend = body.emails.filter((e: string) => e && e.trim() !== "")
    } else if (body.email) {
      emailsToSend = [body.email]
    }
  } catch {
    // Si no hay body, continuar sin email personalizado
  }

  const admin = createAdminClient()

  // Obtener el recibo completo con todos los datos
  const { data: recibo, error: fetchError } = await admin
    .from("recibos_pago")
    .select(`
      *,
      propiedad:propiedades(direccion, ciudad, barrio, user_id)
    `)
    .eq("id", id)
    .single()

  if (fetchError || !recibo) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }

  // Si es propietario, verificar que la propiedad pertenezca al usuario
  if (role === "propietario") {
    const propiedad = recibo.propiedad as any
    if (!propiedad || propiedad.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para ver este recibo" }, { status: 403 })
    }
  }

  // Generar URL del PDF
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arrenlex.com"
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
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f7fafc; padding: 30px 20px; border: 1px solid #e2e8f0; }
    .details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 1px solid #e2e8f0; }
    .details p { margin: 5px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #4f46e5; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
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
    // Si no se proporcionaron emails, intentar obtener solo el del propietario
    if (emailsToSend.length === 0) {
      // Obtener email del propietario desde la propiedad
      if (recibo.propiedad?.user_id) {
        const { data: propietario } = await admin
          .from("perfiles")
          .select("email")
          .eq("id", recibo.propiedad.user_id)
          .single()

        if (propietario?.email) {
          emailsToSend.push(propietario.email)
        }
      }
    }

    // Si aún no hay emails, retornar error (pero permitir enviar si el usuario los proporcionó)
    if (emailsToSend.length === 0) {
      return NextResponse.json({ error: "No se pudo determinar ningún email. Por favor ingrésalo manualmente." }, { status: 400 })
    }

    // Enviar emails a todos los destinatarios
    const resultados = []
    for (const toEmail of emailsToSend) {
      const { data, error: emailError } = await resend.emails.send({
        from: 'Arrenlex <noreply@arrenlex.com>',
        to: toEmail,
        subject: `Recibo de Pago - ${recibo.numero_recibo || 'N/A'}`,
        html: emailHtml,
      })

      if (emailError) {
        console.error(`Error enviando email a ${toEmail}:`, emailError)
        resultados.push({ email: toEmail, success: false, error: emailError.message })
      } else {
        resultados.push({ email: toEmail, success: true, data })
      }
    }

    // Verificar si al menos un email fue enviado exitosamente
    const algunExito = resultados.some(r => r.success)
    if (!algunExito) {
      return NextResponse.json({ error: "Error al enviar todos los emails", resultados }, { status: 500 })
    }

    // Marcar el recibo como enviado y cambiar estado a completado
    console.log("📧 Actualizando recibo a completado:", id)
    const { error: updateError } = await admin
      .from("recibos_pago")
      .update({
        enviado: true,
        fecha_envio: new Date().toISOString(),
        estado: "completado"
      })
      .eq("id", id)

    if (updateError) {
      console.error("❌ Error actualizando recibo:", updateError)
    } else {
      console.log("✅ Recibo actualizado a completado")
    }

    const exitosos = resultados.filter(r => r.success).length
    return NextResponse.json({
      success: true,
      message: `Email enviado correctamente a ${exitosos} destinatario(s)`,
      resultados
    })
  } catch (err: any) {
    console.error("Error en endpoint de envío:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
