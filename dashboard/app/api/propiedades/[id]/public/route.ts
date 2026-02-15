import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Detalle público de una propiedad (sin auth).
 * Solo devuelve si estado = 'disponible'; si no, 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("propiedades")
    .select("*")
    .eq("id", id)
    .eq("estado", "disponible")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  return NextResponse.json(data)
}
