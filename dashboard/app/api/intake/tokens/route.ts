import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * POST /api/intake/tokens
 *
 * Genera un token de aplicación de un solo uso (válido 24 h) para una propiedad.
 * Solo accesible por admin o propietario de la propiedad.
 *
 * Body: { propiedad_id: string }
 * Response: { token: string, url: string, expira_en: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

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

  // Verificar que la propiedad existe y que el propietario la controla
  const { data: propiedad, error: errProp } = await admin
    .from("propiedades")
    .select("id, user_id, estado")
    .eq("id", propiedadIdTrim)
    .single()

  if (errProp || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  if (role === "propietario" && propiedad.user_id !== user.id) {
    return NextResponse.json({ error: "No tienes acceso a esta propiedad" }, { status: 403 })
  }

  // Insertar token — la BD genera el valor aleatorio y expira_en automáticamente
  const { data: tokenData, error: errInsert } = await admin
    .from("aplicacion_tokens")
    .insert({ propiedad_id: propiedadIdTrim })
    .select("token, expira_en")
    .single()

  if (errInsert || !tokenData) {
    console.error("[intake/tokens POST]", errInsert)
    return NextResponse.json({ error: "Error al generar el token" }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.arrenlex.com"
  const url = `${baseUrl}/catalogo/propiedades/${propiedadIdTrim}/aplicacion?token=${tokenData.token}`

  return NextResponse.json(
    { token: tokenData.token, url, expira_en: tokenData.expira_en },
    { status: 201 }
  )
}
