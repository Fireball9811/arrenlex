import { NextResponse } from "next/server"
import { requireAdminOrPropietario } from "@/lib/habeas-data/route-auth"
import { RESPONDER_ESTADO_FINAL_VALUES } from "@/lib/habeas-data/constants"
import { getResendClient } from "@/lib/email/transport"
import { buildMailtoHabeasRespuesta, sendHabeasRespuestaEmail } from "@/lib/email/send-habeas-respuesta"

const TABLE = "arrenlex_habeas_data_requests"

function normEmail(e: string | null | undefined): string {
  return (e ?? "").trim().toLowerCase()
}

function isResponderEstado(v: unknown): v is (typeof RESPONDER_ESTADO_FINAL_VALUES)[number] {
  return typeof v === "string" && (RESPONDER_ESTADO_FINAL_VALUES as readonly string[]).includes(v)
}

/**
 * POST — Enviar respuesta Habeas Data por correo y actualizar registro, o fallback manual.
 *
 * Body: { id, to, subject, message, estado, confirmManualSend?: boolean }
 */
export async function POST(request: Request) {
  const auth = await requireAdminOrPropietario()
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const id = typeof body.id === "string" ? body.id.trim() : ""
  const to = typeof body.to === "string" ? body.to.trim() : ""
  const subject = typeof body.subject === "string" ? body.subject.trim() : ""
  const message = typeof body.message === "string" ? body.message : ""
  const estado = body.estado
  const confirmManualSend = body.confirmManualSend === true

  if (!id || !to || !subject) {
    return NextResponse.json({ error: "Faltan id, to o subject" }, { status: 400 })
  }
  if (!message.trim()) {
    return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 })
  }
  if (!isResponderEstado(estado)) {
    return NextResponse.json({ error: "Estado final no permitido" }, { status: 400 })
  }

  const { data: row, error: readErr } = await auth.ctx.admin.from(TABLE).select("*").eq("id", id).maybeSingle()
  if (readErr || !row) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
  }

  const emailSolicitud = typeof row.email === "string" ? row.email : ""
  if (!emailSolicitud.trim()) {
    return NextResponse.json({ error: "La solicitud no tiene email registrado" }, { status: 400 })
  }

  if (normEmail(to) !== normEmail(emailSolicitud)) {
    return NextResponse.json(
      {
        error:
          "El correo «Para» debe coincidir con el email de la solicitud registrada. Si necesita otro destinatario, actualice primero el registro en Editar.",
        expectedEmail: emailSolicitud.trim(),
      },
      { status: 400 }
    )
  }

  const userId = auth.ctx.userId

  if (confirmManualSend) {
    const { error: upErr } = await auth.ctx.admin
      .from(TABLE)
      .update({
        estado,
        fecha_respuesta: new Date().toISOString(),
        respuesta: message.trim(),
        respuesta_asunto: subject,
        respuesta_enviada: false,
        respuesta_error: "Respuesta guardada. Envío manual requerido.",
        respondido_por: userId,
      })
      .eq("id", id)

    if (upErr) {
      console.error("[habeas-data responder manual]", upErr)
      return NextResponse.json({ error: "No se pudo guardar la respuesta" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      manual: true,
      message: "Respuesta enviada y solicitud actualizada.",
    })
  }

  const resend = getResendClient()
  if (!resend) {
    const mailtoUrl = buildMailtoHabeasRespuesta(to, subject, message.trim())
    return NextResponse.json({
      needsManual: true,
      mailtoUrl,
      message:
        "Correo preparado. Envíelo desde habeasdata@arrenlex.com y confirme el envío.",
    })
  }

  const send = await sendHabeasRespuestaEmail({
    to,
    subject,
    textBody: message.trim(),
  })

  if (!send.success) {
    const errMsg = send.error ?? "Error al enviar correo"
    const { error: failPatch } = await auth.ctx.admin
      .from(TABLE)
      .update({
        estado: "en_revision",
        respuesta_error: errMsg,
      })
      .eq("id", id)

    if (failPatch) {
      console.error("[habeas-data responder fail-patch]", failPatch)
    }

    return NextResponse.json({ error: errMsg }, { status: 502 })
  }

  const { error: upErr } = await auth.ctx.admin
    .from(TABLE)
    .update({
      estado,
      fecha_respuesta: new Date().toISOString(),
      respuesta: message.trim(),
      respuesta_asunto: subject,
      respuesta_enviada: true,
      respuesta_error: null,
      respondido_por: userId,
    })
    .eq("id", id)

  if (upErr) {
    console.error("[habeas-data responder update]", upErr)
    return NextResponse.json(
      { error: "El correo se envió pero no se pudo actualizar el registro. Revise en Resend y actualice manualmente." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: "Respuesta enviada y solicitud actualizada.",
  })
}
