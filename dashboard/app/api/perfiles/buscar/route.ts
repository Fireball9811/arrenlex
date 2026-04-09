import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/perfiles/buscar?nombre=xxx
 * Busca un perfil por nombre y devuelve su email
 * Accesible para admin y propietario
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const nombre = searchParams.get("nombre")

  if (!nombre || nombre.trim() === "") {
    return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Buscar perfil por nombre
  const { data, error } = await admin
    .from("perfiles")
    .select("id, email, nombre, cedula")
    .ilike("nombre", `%${nombre.trim()}%`)
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ email: null })
  }

  return NextResponse.json({ email: data[0].email, perfil: data[0] })
}
