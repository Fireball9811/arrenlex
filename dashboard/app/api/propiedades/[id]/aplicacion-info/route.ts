import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Info pública de una propiedad para el formulario de aplicación.
 * Requiere un token de un solo uso válido (?token=...).
 * Devuelve 410 Gone si el token no existe, ya fue usado o expiró.
 * Devuelve 404 si la propiedad no existe o no está disponible.
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

  // Validar el token: debe existir, pertenecer a esta propiedad, no estar usado y no haber expirado
  const { data: tokenData, error: errToken } = await admin
    .from("aplicacion_tokens")
    .select("id, usado, expira_en, propiedad_id")
    .eq("token", token.trim())
    .single()

  if (errToken || !tokenData) {
    return NextResponse.json(
      { error: "Este enlace no es válido." },
      { status: 410 }
    )
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

  // Token válido — devolver info de la propiedad
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

  return NextResponse.json(data)
}
