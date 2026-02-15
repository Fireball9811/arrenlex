import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { CiudadDisponible } from "@/lib/types/database"

// GET - Obtener ciudades con propiedades disponibles (solo nombres, string[])
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc("obtener_ciudades_disponibles")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const raw = (data as CiudadDisponible[] | null) ?? []
  const ciudades = raw.map((c: { ciudad: string }) => c.ciudad)
  return NextResponse.json(ciudades)
}
