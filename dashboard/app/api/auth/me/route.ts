import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)

  // Obtener datos del perfil (nombre, cedula)
  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from("perfiles")
    .select("nombre, cedula")
    .eq("id", user.id)
    .single()

  return NextResponse.json({
    email: user.email,
    id: user.id,
    role,
    nombre: perfil?.nombre || "",
    cedula: perfil?.cedula || "",
  })
}
