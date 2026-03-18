import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

// GET - Obtener el rol del usuario autenticado o info de otro usuario (por user_id)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("user_id")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Si se solicita info de otro usuario por user_id
  if (userId) {
    // Verificar que el usuario autenticado es admin
    try {
      const role = await getUserRole(supabase, user)
      if (role !== "admin") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
      }
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Obtener datos del perfil del usuario solicitado
    const admin = createAdminClient()
    const { data: perfil, error } = await admin
      .from("perfiles")
      .select("id, nombre, cedula, rol, email, celular")
      .eq("id", userId)
      .single()

    if (error || !perfil) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(perfil)
  }

  // Si no hay user_id, retornar solo el rol del usuario autenticado
  try {
    const role = await getUserRole(supabase, user)
    return NextResponse.json({ role })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
