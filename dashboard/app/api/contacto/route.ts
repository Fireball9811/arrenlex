import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendContactoEmail } from "@/lib/email/send-contacto"
import { sendWhatsAppCEO } from "@/lib/whatsapp/send-whatsapp"
import { rateLimitMiddleware, RateLimitPresets, getRateLimitHeaders } from "@/lib/rate-limit"
import { contactFormSchema, formatZodError } from "@/lib/validation/schemas"
import { secureLog } from "@/lib/logging/secure-logger"

export async function POST(request: Request) {
  // Rate limiting: 5 mensajes por hora
  const rateLimitResult = rateLimitMiddleware(request, RateLimitPresets.contact)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Has enviado demasiados mensajes. Por favor espera un poco antes de enviar otro.",
      },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    )
  }

  try {
    const body = await request.json()

    // Validar con Zod
    const validationResult = contactFormSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = formatZodError(validationResult.error)
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      )
    }

    const { nombre, celular, email, tipo } = validationResult.data
    const tipoLabel = tipo === "propietario" ? "Propietario" : "Arrendatario"
    const celularTrim = celular.replace(/\D/g, "") // Solo dígitos para el almacenamiento

    const admin = createAdminClient()
    const { error: insertError } = await admin.from("contactos_landing").insert({
      nombre,
      celular: celularTrim,
      email,
      tipo,
      estado: "pendiente",
    })

    if (insertError) {
      secureLog.error("api/contacto", insertError)
      return NextResponse.json({ error: "Error al guardar el contacto" }, { status: 500 })
    }

    secureLog.userAction("CONTACT_FORM_SUBMITTED", undefined, { tipo })

    const [emailResult, waResult] = await Promise.allSettled([
      sendContactoEmail({
        nombre,
        celular: celularTrim,
        email,
        tipo,
      }),
      sendWhatsAppCEO(
        [
          `📞 *Nuevo contacto desde la web*`,
          ``,
          `👤 Tipo: ${tipoLabel}`,
          `📝 Nombre: ${nombre}`,
          `📱 Celular: ${celularTrim}`,
          `📧 Correo: ${email}`,
        ].join("\n")
      ),
    ])

    if (emailResult.status === "rejected") {
      secureLog.warn("api/contacto email failed", { reason: emailResult.reason })
    } else if (!emailResult.value.success) {
      secureLog.warn("api/contacto email failed", { reason: emailResult.value.error })
    }

    if (waResult.status === "rejected") {
      secureLog.warn("api/contacto whatsapp failed", { reason: waResult.reason })
    } else if (!waResult.value.success) {
      secureLog.warn("api/contacto whatsapp failed", { reason: waResult.value.error })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    secureLog.error("api/contacto", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
