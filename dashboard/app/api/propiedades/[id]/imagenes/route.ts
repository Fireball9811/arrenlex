import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { PropiedadImagen } from "@/lib/types/database"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Obtener imágenes de una propiedad específica
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const { id } = await context.params

  const { data, error } = await supabase
    .from("propiedades_imagenes")
    .select("*")
    .eq("propiedad_id", id)
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json((data as PropiedadImagen[]) ?? [])
}
