import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const PAGE_SIZE = 20

/**
 * GET - Listado público de propiedades disponibles (sin auth).
 * Query params:
 *   ciudad  (opcional) — filtra por ciudad
 *   cursor  (opcional) — created_at del último registro recibido (paginación por cursor)
 * Respuesta: { propiedades, nextCursor }
 */
export async function GET(request: Request) {
  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const ciudad = searchParams.get("ciudad")
  const cursor = searchParams.get("cursor")

  let query = admin
    .from("propiedades")
    .select("id, area, descripcion, habitaciones, banos, ascensor, depositos, parqueaderos, created_at")
    .eq("estado", "disponible")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (ciudad) {
    query = query.eq("ciudad", ciudad)
  }

  if (cursor) {
    query = query.lt("created_at", cursor)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const hayMas = rows.length > PAGE_SIZE
  const list = hayMas ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hayMas ? list[list.length - 1].created_at : null

  if (list.length === 0) {
    return NextResponse.json({ propiedades: [], nextCursor: null })
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

  const propiedades = list.map((p) => ({
    ...p,
    imagen_principal: firstByPropiedad.get(p.id) ?? null,
  }))

  return NextResponse.json({ propiedades, nextCursor })
}
