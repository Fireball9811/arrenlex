import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canReadPerfilById } from "@/lib/auth/perfil-access"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Obtiene solo el email de un perfil (para envío de recibos)
 * Accesible para admin y propietario
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params

  if (!canReadPerfilById(role, user.id, id)) {
    return NextResponse.json({ error: "No tienes permiso para ver este correo" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("perfiles")
    .select("email")
    .eq("id", id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ email: data.email })
}
