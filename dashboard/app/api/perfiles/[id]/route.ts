import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  // Intentar obtener el perfil con todas las columnas posibles
  const { data, error } = await admin
    .from("perfiles")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching perfil:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
  }

  // Retornar solo los campos que necesitamos, con fallbacks si no existen
  return NextResponse.json({
    id: data.id,
    nombre: data.nombre || "",
    cedula: data.cedula || "",
    email: data.email || "",
    role: data.role || ""
  })
}
