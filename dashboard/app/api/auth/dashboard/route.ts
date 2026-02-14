import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role"
import { getDashboardPathByRole } from "@/lib/auth/redirect-by-role"

/**
 * GET /api/auth/dashboard
 * Devuelve la URL de redirección según el rol del usuario (punto centralizado).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado", redirect: "/login" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  const redirect = getDashboardPathByRole(role)
  return NextResponse.json({ redirect, role })
}
