import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/lookup-username
 * Endpoint público que busca el email correspondiente a un username.
 * No requiere autenticación.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username } = body

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username es requerido" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Buscar email por username
    const { data: perfil } = await admin
      .from("perfiles")
      .select("email")
      .eq("username", username.trim())
      .maybeSingle()

    if (!perfil || !perfil.email) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      email: perfil.email,
    })

  } catch (err: any) {
    console.error("[lookup-username]", err)
    return NextResponse.json(
      { error: "Error al buscar usuario" },
      { status: 500 }
    )
  }
}
