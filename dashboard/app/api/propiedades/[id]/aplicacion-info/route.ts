import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Info pública de una propiedad para el formulario de aplicación.
 * Requiere ?token=... válido (no usado, no expirado, propiedad disponible).
 * Incluye en la respuesta tipo_solicitante y grupo_solicitud_id asociados al token.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token || !token.trim()) {
    return NextResponse.json(
      { error: "Se requiere un enlace de invitación válido para acceder." },
      { status: 410 }
    )
  }

  const admin = createAdminClient()

  const { data: tokenData, error: errToken } = await admin
    .from("aplicacion_tokens")
    .select("id, usado, expira_en, propiedad_id, grupo_solicitud_id, tipo_solicitante")
    .eq("token", token.trim())
    .single()

  if (errToken || !tokenData) {
    return NextResponse.json({ error: "Este enlace no es válido." }, { status: 410 })
  }

  if (tokenData.propiedad_id !== id) {
    return NextResponse.json(
      { error: "Este enlace no corresponde a esta propiedad." },
      { status: 410 }
    )
  }

  if (tokenData.usado) {
    return NextResponse.json(
      { error: "Este enlace ya fue utilizado. La aplicación ya fue enviada." },
      { status: 410 }
    )
  }

  if (new Date(tokenData.expira_en) < new Date()) {
    return NextResponse.json(
      { error: "Este enlace ha expirado. Solicita un nuevo enlace al arrendador." },
      { status: 410 }
    )
  }

  const { data, error } = await admin
    .from("propiedades")
    .select("id, ciudad, area, valor_arriendo, descripcion")
    .eq("id", id)
    .eq("estado", "disponible")
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: "Propiedad no encontrada o no disponible" },
      { status: 404 }
    )
  }

  const tipo =
    typeof tokenData.tipo_solicitante === "string" &&
    tokenData.tipo_solicitante.trim().toLowerCase() === "coarrendatario"
      ? "coarrendatario"
      : "arrendatario_principal"

  return NextResponse.json({
    ...data,
    grupo_solicitud_id: tokenData.grupo_solicitud_id ?? null,
    tipo_solicitante: tipo,
  })
}
