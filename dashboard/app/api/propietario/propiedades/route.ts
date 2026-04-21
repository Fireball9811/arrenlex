import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Devuelve las propiedades DISPONIBLES del propietario autenticado.
 *
 * Se consideran disponibles aquellas que:
 *  - NO tienen estado = "arrendado", y
 *  - NO tienen un contrato en estado "activo".
 *
 * Se usa en el dropdown de filtro de /propietario/mensajes → Posibles
 * arrendatarios, donde no tiene sentido mostrar propiedades que ya están
 * arrendadas.
 *
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

  // IDs con contrato activo (se excluyen aunque no estén marcados como "arrendado")
  const { data: contratosActivos, error: errorContratos } = await admin
    .from("contratos")
    .select("propiedad_id")
    .eq("estado", "activo")

  if (errorContratos) {
    console.error("[propietario/propiedades GET] contratos activos", errorContratos)
    return NextResponse.json({ error: "Error al obtener contratos" }, { status: 500 })
  }

  const idsOcupadas = new Set(
    (contratosActivos ?? [])
      .map((c) => c.propiedad_id)
      .filter((id): id is string => typeof id === "string" && !!id)
  )

  const { data: propiedades, error } = await admin
    .from("propiedades")
    .select("id, direccion, ciudad, estado")
    .eq("user_id", user.id)
    .neq("estado", "arrendado")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[propietario/propiedades GET]", error)
    return NextResponse.json({ error: "Error al obtener propiedades" }, { status: 500 })
  }

  const disponibles = (propiedades ?? [])
    .filter((p) => !idsOcupadas.has(p.id))
    .map(({ id, direccion, ciudad }) => ({ id, direccion, ciudad }))

  return NextResponse.json(disponibles)
}
