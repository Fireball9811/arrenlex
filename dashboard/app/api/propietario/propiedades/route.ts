import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Devuelve las propiedades del propietario autenticado.
 * Solo accesible para propietarios.
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
  if (role !== "propietario") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: propiedades, error } = await admin
    .from("propiedades")
    .select("id, direccion, ciudad")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[propietario/propiedades GET]", error)
    return NextResponse.json({ error: "Error al obtener propiedades" }, { status: 500 })
  }

  return NextResponse.json(propiedades ?? [])
}
