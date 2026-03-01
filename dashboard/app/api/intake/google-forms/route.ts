import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/intake/google-forms
 *
 * Endpoint público que recibe submissions de Google Forms vía Google Apps Script.
 * Almacena todas las respuestas en raw_data (JSONB) para máxima escalabilidad:
 * agregar preguntas al form no requiere cambios en la tabla ni en este endpoint.
 *
 * Seguridad:
 * - RLS habilitado en la tabla. El rol anon solo puede INSERT.
 * - Sin SELECT, UPDATE ni DELETE desde el exterior.
 */
export async function POST(req: NextRequest) {
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
