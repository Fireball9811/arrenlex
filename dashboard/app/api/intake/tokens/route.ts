import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { insertarParAplicacionTokens } from "@/lib/intake/aplicacion-par-tokens"
import { respuestaErrorGeneracionTokens } from "@/lib/intake/tokens-error-response"

/**
 * POST /api/intake/tokens
 *
 * Genera dos tokens de aplicación (principal y coarrendatario), mismo grupo,
 * válidos 24 h y de un solo uso cada uno.
 *
 * Body: { propiedad_id: string }
 * Response: { grupo_solicitud_id, expira_en, principal: { token, url }, coarrendatario: { token, url } }
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

  const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const grupoSolicitudId = randomUUID()

  const par = await insertarParAplicacionTokens(admin, {
    propiedadId: propiedadIdTrim,
    grupoSolicitudId: grupoSolicitudId,
    expiraEn,
  })

  if (!par.ok) {
    return respuestaErrorGeneracionTokens(
      "[intake/tokens POST]",
      par.error,
      "Error al generar los enlaces"
    )
  }

  const { principal, coarrendatario } = par

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.arrenlex.com"
  const urlPrincipal = `${baseUrl}/catalogo/propiedades/${propiedadIdTrim}/aplicacion?token=${principal.token}`
  const urlCoarrendatario = `${baseUrl}/catalogo/propiedades/${propiedadIdTrim}/aplicacion?token=${coarrendatario.token}`

  return NextResponse.json(
    {
      grupo_solicitud_id: grupoSolicitudId,
      expira_en: principal.expira_en,
      principal: { token: principal.token, url: urlPrincipal },
      coarrendatario: { token: coarrendatario.token, url: urlCoarrendatario },
      token: principal.token,
      url: urlPrincipal,
    },
    { status: 201 }
  )
}
