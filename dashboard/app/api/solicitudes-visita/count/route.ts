import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Devuelve solo el número de solicitudes pendientes.
 * Admin: total de pendientes. Propietario: solo pendientes de sus propiedades.
 * Requiere sesión; rechaza a inquilinos.
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
  if (role === "inquilino") {
    return NextResponse.json({ count: 0 })
  }

  const admin = createAdminClient()

  if (role === "admin") {
    const { count, error } = await admin
      .from("solicitudes_visita")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendiente")

    if (error) {
      console.error("[solicitudes-visita count GET]", error)
      return NextResponse.json({ count: 0 })
    }
    return NextResponse.json({ count: count ?? 0 })
  }

  // propietario: solo propiedades del usuario
  const { data: propIds } = await admin
    .from("propiedades")
    .select("id")
    .eq("user_id", user.id)

  const ids = (propIds ?? []).map((p) => p.id)
  if (ids.length === 0) {
    return NextResponse.json({ count: 0 })
  }

  const { count, error } = await admin
    .from("solicitudes_visita")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendiente")
    .in("propiedad_id", ids)

  if (error) {
    console.error("[solicitudes-visita count GET]", error)
    return NextResponse.json({ count: 0 })
  }
  return NextResponse.json({ count: count ?? 0 })
}
