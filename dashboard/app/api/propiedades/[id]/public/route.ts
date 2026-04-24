import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Detalle público de una propiedad (sin auth).
 * Solo devuelve si estado = 'disponible'. Expone campos públicos del inmueble
 * (titulo, tipo, dirección, barrio, ciudad, specs, descripción e imágenes).
 * No expone valor_arriendo, user_id ni datos del propietario.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: propiedad, error } = await admin
    .from("propiedades")
    .select(
      "id, titulo, tipo, descripcion, area, direccion, barrio, ciudad, habitaciones, banos, ascensor, depositos, parqueaderos, numero_matricula"
    )
    .eq("id", id)
    .eq("estado", "disponible")
    .single()

  if (error || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  const { data: imagenes } = await admin
    .from("propiedades_imagenes")
    .select("id, url_publica, categoria, orden, nombre_archivo")
    .eq("propiedad_id", id)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true })

  const result = {
    ...propiedad,
    imagenes: imagenes ?? [],
  }

  return NextResponse.json(result)
}
