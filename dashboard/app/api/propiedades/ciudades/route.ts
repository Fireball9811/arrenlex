import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET - Ciudades con propiedades disponibles (ruta pública, sin autenticación).
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("propiedades")
      .select("ciudad")
      .eq("estado", "disponible")
      .not("ciudad", "is", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const raw = (data as { ciudad: string | null }[] | null) ?? []
    const ciudades = [...new Set(raw.map((r) => r.ciudad).filter((c): c is string => typeof c === "string" && c.trim() !== ""))].sort()
    return NextResponse.json(ciudades)
  } catch (e) {
    return NextResponse.json(
      { error: "No se pudo cargar el listado de ciudades." },
      { status: 500 }
    )
  }
}
