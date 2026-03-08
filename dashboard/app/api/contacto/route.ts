import { NextResponse } from "next/server"
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

    const [emailResult, waResult] = await Promise.allSettled([
      sendContactoEmail({
        nombre: nombre.trim(),
        celular: celular.trim(),
        email: email.trim(),
        tipo,
      }),
      sendWhatsAppCEO(
        [
          `📞 *Nuevo contacto desde la web*`,
          ``,
          `👤 Tipo: ${tipoLabel}`,
          `📝 Nombre: ${nombre.trim()}`,
          `📱 Celular: ${celular.trim()}`,
          `📧 Correo: ${email.trim()}`,
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
