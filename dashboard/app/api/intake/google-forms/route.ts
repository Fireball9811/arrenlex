import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimitMiddleware, RateLimitPresets, getRateLimitHeaders } from "@/lib/rate-limit"

/**
 * POST /api/intake/google-forms
 *
 * Recibe submissions de Google Forms vía Google Apps Script.
 * Opcional: header `x-webhook-secret` = GOOGLE_FORMS_WEBHOOK_SECRET (recomendado en producción).
 */
export async function POST(req: NextRequest) {
  const rateLimitResult = rateLimitMiddleware(req, RateLimitPresets.publicForm)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  const webhookSecret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET
  if (webhookSecret) {
    const provided = req.headers.get("x-webhook-secret")
    if (provided !== webhookSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  let body: Record<string, unknown>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    return NextResponse.json({ error: "Body vacío o inválido" }, { status: 400 })
  }

  const { fecha_envio, ...rawFields } = body

  const supabase = await createClient()

  const { error } = await supabase.from("arrenlex_form_intake").insert({
    raw_data: rawFields,
    fecha_envio: fecha_envio
      ? new Date(fecha_envio as string).toISOString()
      : new Date().toISOString(),
  })

  if (error) {
    console.error("[intake/google-forms] Error al insertar:", error.message)
    return NextResponse.json({ error: "Error al guardar la solicitud" }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
