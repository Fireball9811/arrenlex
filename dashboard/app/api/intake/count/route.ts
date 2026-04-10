import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Devuelve el total de registros NO gestionados en arrenlex_form_intake.
 * - Admin: cuenta todos los registros no gestionados
 * - Propietario: cuenta solo los de sus propiedades no gestionadas
 * - Inquilinos reciben { count: 0 }
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ count: 0 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ count: 0 })
  }

  const admin = createAdminClient()

  let query = admin
    .from("arrenlex_form_intake")
    .select("id", { count: "exact", head: true })
    .eq("gestionado", false)

  // Si es propietario, filtrar por sus propiedades
  if (role === "propietario") {
    const { data: propiedades } = await admin
      .from("propiedades")
      .select("id")
      .eq("user_id", user.id)

    if (!propiedades || propiedades.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    const propiedadIds = propiedades.map(p => p.id)
    query = query.in("propiedad_id", propiedadIds)
  }

  const { count, error } = await query

  if (error) {
    console.error("[intake count GET]", error)
    return NextResponse.json({ count: 0 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
