import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/intake/tokens/publico
 *
 * Endpoint público (sin autenticación) que genera un token de aplicación
 * de un solo uso para una propiedad disponible.
 *
 * Cualquier visitante puede generar su propio token para diligenciar
 * el formulario una única vez. El token expira en 24 horas.
 *
 * Body: { propiedad_id: string }
 * Response: { token: string, url: string, expira_en: string }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { propiedad_id } = body
  if (typeof propiedad_id !== "string" || !propiedad_id.trim()) {
    return NextResponse.json({ error: "propiedad_id es requerido" }, { status: 400 })
  }

  const propiedadIdTrim = propiedad_id.trim()
  const admin = createAdminClient()

  // Verificar que la propiedad existe y está disponible
  const { data: propiedad, error: errProp } = await admin
    .from("propiedades")
    .select("id, estado")
    .eq("id", propiedadIdTrim)
    .single()

  if (errProp || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  if (propiedad.estado !== "disponible") {
    return NextResponse.json(
      { error: "Esta propiedad no está disponible para aplicar en este momento." },
      { status: 400 }
    )
  }

  // Insertar token — la BD genera el valor aleatorio y expira_en (now + 1 day) automáticamente
  const { data: tokenData, error: errInsert } = await admin
    .from("aplicacion_tokens")
    .insert({ propiedad_id: propiedadIdTrim })
    .select("token, expira_en")
    .single()

  if (errInsert || !tokenData) {
    console.error("[intake/tokens/publico POST]", errInsert)
    return NextResponse.json({ error: "Error al generar el acceso. Intenta de nuevo." }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.arrenlex.com"
  const url = `${baseUrl}/catalogo/propiedades/${propiedadIdTrim}/aplicacion?token=${tokenData.token}`

  return NextResponse.json(
    { token: tokenData.token, url, expira_en: tokenData.expira_en },
    { status: 201 }
  )
}
