import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Info pública de una propiedad para el formulario de aplicación.
 * Solo disponible si estado = 'disponible'.
 * Expone valor_arriendo (canon) para mostrarlo en el encabezado del wizard.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("propiedades")
    .select("id, ciudad, area, valor_arriendo, descripcion")
    .eq("id", id)
    .eq("estado", "disponible")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Propiedad no encontrada o no disponible" }, { status: 404 })
  }

  return NextResponse.json(data)
}
