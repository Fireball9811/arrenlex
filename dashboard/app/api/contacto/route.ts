import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendContactoEmail } from "@/lib/email/send-contacto"
import { sendWhatsAppCEO } from "@/lib/whatsapp/send-whatsapp"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, celular, email, tipo } = body

    if (!nombre?.trim() || !celular?.trim() || !email?.trim() || !tipo) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      )
    }

    if (!["propietario", "arrendatario"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
    }

    const tipoLabel = tipo === "propietario" ? "Propietario" : "Arrendatario"
    const nombreTrim = nombre.trim()
    const celularTrim = celular.trim()
    const emailTrim = email.trim()

    const admin = createAdminClient()
    const { error: insertError } = await admin.from("contactos_landing").insert({
      nombre: nombreTrim,
      celular: celularTrim,
      email: emailTrim,
      tipo,
      estado: "pendiente",
    })

    if (insertError) {
      console.error("[api/contacto] Error insertando en contactos_landing:", insertError)
      return NextResponse.json({ error: "Error al guardar el contacto" }, { status: 500 })
    }

    const [emailResult, waResult] = await Promise.allSettled([
      sendContactoEmail({
        nombre: nombreTrim,
        celular: celularTrim,
        email: emailTrim,
        tipo,
      }),
      sendWhatsAppCEO(
        [
          `📞 *Nuevo contacto desde la web*`,
          ``,
          `👤 Tipo: ${tipoLabel}`,
          `📝 Nombre: ${nombreTrim}`,
          `📱 Celular: ${celularTrim}`,
          `📧 Correo: ${emailTrim}`,
        ].join("\n")
      ),
    ])

    if (emailResult.status === "rejected") {
      console.error("[api/contacto] Error en email:", emailResult.reason)
    } else if (!emailResult.value.success) {
      console.error("[api/contacto] Email no enviado:", emailResult.value.error)
    }

    if (waResult.status === "rejected") {
      console.warn("[api/contacto] Error en WhatsApp:", waResult.reason)
    } else if (!waResult.value.success) {
      console.warn("[api/contacto] WhatsApp no enviado:", waResult.value.error)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[api/contacto] Error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
