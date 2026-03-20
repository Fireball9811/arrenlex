import { NextResponse } from "next/server"

/**
 * GET - Obtiene propiedades que NO tienen contrato activo
 * Endpoint: /api/propiedades/disponibles
 */
export async function GET(request: Request) {
  console.log("🔵 [propiedades/disponibles] GET iniciado")

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const { getUserRole } = await import("@/lib/auth/role")

    const supabase = await createClient()
    const authData = await supabase.auth.getUser()
    const user = authData.data?.user

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = await getUserRole(supabase, user)
    if (!role || (role !== "admin" && role !== "propietario")) {
      return NextResponse.json({ error: "No tienes permiso" }, { status: 403 })
    }

    const admin = createAdminClient()

    // Obtener propiedades con contrato activo
    const { data: contratosActivos, error: errorContratos } = await admin
      .from("contratos")
      .select("propiedad_id")
      .eq("estado", "activo")

    if (errorContratos) {
      console.error("❌ Error obteniendo contratos activos:", errorContratos)
      return NextResponse.json({ error: errorContratos.message }, { status: 500 })
    }

    // IDs de propiedades con contrato activo
    const propiedadesOcupadas = new Set(
      (contratosActivos || []).map(c => c.propiedad_id)
    )

    // Obtener todas las propiedades según el rol
    let query = admin.from("propiedades").select("*")

    if (role === "propietario") {
      query = query.eq("user_id", user.id)
    }

    const { data: todasPropiedades, error: errorPropiedades } = await query
      .order("created_at", { ascending: false })

    if (errorPropiedades) {
      console.error("❌ Error obteniendo propiedades:", errorPropiedades)
      return NextResponse.json({ error: errorPropiedades.message }, { status: 500 })
    }

    // Filtrar propiedades sin contrato activo
    const propiedadesDisponibles = (todasPropiedades || []).filter(
      p => !propiedadesOcupadas.has(p.id)
    )

    console.log("✓ Propiedades disponibles:", propiedadesDisponibles.length, "de", todasPropiedades?.length || 0)

    return NextResponse.json(propiedadesDisponibles)

  } catch (err: any) {
    console.error("❌ ERROR GENERAL:", err?.message || err)
    return NextResponse.json(
      { error: "Error interno del servidor", details: err?.message },
      { status: 500 }
    )
  }
}
