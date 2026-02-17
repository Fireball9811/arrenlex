import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "maintenance_special" && role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // Filtrar por assigned_to si es especialista
  let query = supabase
    .from("solicitudes_mantenimiento")
    .select(`
      id,
      propiedad_id,
      nombre_completo,
      detalle,
      desde_cuando,
      responsable,
      status,
      assigned_to,
      created_at,
      propiedades (
        id,
        direccion,
        ciudad,
        barrio
      )
    `)
    .order("created_at", { ascending: false })

  if (role === "maintenance_special") {
    query = query.eq("assigned_to", user.id)
  }

  const { data, error } = await query

  if (error) {
    console.error("[maintenance assigned GET]", error)
    return NextResponse.json({ error: "Error al listar solicitudes" }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
