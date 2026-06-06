import { createAdminClient } from "@/lib/supabase/admin"
import type { UserRole } from "@/lib/auth/role"

export type NavCounts = {
  solicitudes: number
  intake: number
  mantenimiento: number
}

const EMPTY: NavCounts = { solicitudes: 0, intake: 0, mantenimiento: 0 }

async function getPropiedadIds(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin.from("propiedades").select("id").eq("user_id", userId)
  return (data ?? []).map((p) => p.id)
}

export async function getNavCounts(
  userId: string,
  role: UserRole
): Promise<NavCounts> {
  if (role !== "admin" && role !== "propietario") return EMPTY

  const admin = createAdminClient()
  const propiedadIds = role === "propietario" ? await getPropiedadIds(userId) : null

  if (role === "propietario" && (!propiedadIds || propiedadIds.length === 0)) {
    return EMPTY
  }

  let solicitudesQuery = admin
    .from("solicitudes_visita")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendiente")

  if (role === "propietario" && propiedadIds) {
    solicitudesQuery = solicitudesQuery.in("propiedad_id", propiedadIds)
  }

  let intakeQuery = admin
    .from("arrenlex_form_intake")
    .select("id", { count: "exact", head: true })
    .eq("gestionado", false)

  if (role === "propietario" && propiedadIds) {
    intakeQuery = intakeQuery.in("propiedad_id", propiedadIds)
  }

  let mantenimientoQuery = admin
    .from("solicitudes_mantenimiento")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendiente")

  if (role === "propietario" && propiedadIds) {
    mantenimientoQuery = mantenimientoQuery.in("propiedad_id", propiedadIds)
  }

  const [solicitudesRes, intakeRes, mantenimientoRes] = await Promise.all([
    solicitudesQuery,
    intakeQuery,
    mantenimientoQuery,
  ])

  return {
    solicitudes: solicitudesRes.count ?? 0,
    intake: intakeRes.count ?? 0,
    mantenimiento: mantenimientoRes.count ?? 0,
  }
}
