import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/admin/propietarios
 * Retorna la lista de usuarios con rol 'propietario' para el selector de filtro.
 * Solo accesible por admin.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden acceder" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("perfiles")
    .select("id, nombre, email")
    .eq("role", "propietario")
    .order("nombre", { ascending: true })

  if (error) {
    console.error("[admin/propietarios] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
