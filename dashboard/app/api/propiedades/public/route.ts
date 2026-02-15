import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Listado público de propiedades disponibles (sin auth).
 * Query: ciudad (opcional). Solo expone id, area e imagen_principal (sin dirección, precio ni propietario).
 */
export async function GET(request: Request) {
  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const ciudad = searchParams.get("ciudad")

  let query = admin
    .from("propiedades")
    .select("id, area")
    .eq("estado", "disponible")
    .order("created_at", { ascending: false })

  if (ciudad) {
    query = query.eq("ciudad", ciudad)
  }

  const { data: propiedades, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = propiedades ?? []
  if (list.length === 0) {
    return NextResponse.json(list)
  }

  const ids = list.map((p) => p.id)
  const { data: imagenes } = await admin
    .from("propiedades_imagenes")
    .select("propiedad_id, url_publica, orden")
    .in("propiedad_id", ids)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true })

  const firstByPropiedad = new Map<string, string>()
  for (const img of imagenes ?? []) {
    if (!firstByPropiedad.has(img.propiedad_id)) {
      firstByPropiedad.set(img.propiedad_id, img.url_publica)
    }
  }

  const result = list.map((p) => ({
    ...p,
    imagen_principal: firstByPropiedad.get(p.id) ?? null,
  }))

  return NextResponse.json(result)
}
