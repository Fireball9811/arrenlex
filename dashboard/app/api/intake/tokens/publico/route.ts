import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { insertarParAplicacionTokens } from "@/lib/intake/aplicacion-par-tokens"
import { respuestaErrorGeneracionTokens } from "@/lib/intake/tokens-error-response"
import { rateLimitMiddleware, RateLimitPresets, getRateLimitHeaders } from "@/lib/rate-limit"

/**
 * POST /api/intake/tokens/publico
 *
 * Genera dos enlaces (principal y coarrendatario): cada uno con token distinto,
 * mismo grupo, válidos 24 h y de un solo uso.
 *
 * Body: { propiedad_id: string }
 * Response: { grupo_solicitud_id, expira_en, principal: { token, url }, coarrendatario: { token, url } }
 */
export async function POST(request: Request) {
  const rateLimitResult = rateLimitMiddleware(request, RateLimitPresets.publicForm)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
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

  const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const grupoSolicitudId = randomUUID()

  const par = await insertarParAplicacionTokens(admin, {
    propiedadId: propiedadIdTrim,
    grupoSolicitudId: grupoSolicitudId,
    expiraEn,
  })

  if (!par.ok) {
    return respuestaErrorGeneracionTokens(
      "[intake/tokens/publico POST]",
      par.error,
      "Error al generar el acceso. Intenta de nuevo."
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
