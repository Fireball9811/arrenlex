import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

// GET - Listar propietarios para el filtro (solo admin)
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Verificar que sea admin
  const role = await getUserRole(supabase, user)
  if (role !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden ver esta lista" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Obtener todos los usuarios con rol "propietario" que tengan propiedades
  const { data, error } = await admin
    .from("perfiles")
    .select("id, email, nombre, cedula")
    .eq("role", "propietario")
    .order("nombre", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
