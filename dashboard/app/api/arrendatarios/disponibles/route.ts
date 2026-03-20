import { NextResponse } from "next/server"

/**
 * GET - Obtiene arrendatarios que NO tienen contrato activo
 * Endpoint: /api/arrendatarios/disponibles
 */
export async function GET(request: Request) {
  console.log("🔵 [arrendatarios/disponibles] GET iniciado")

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const { createAdminClient } = await import("@/lib/supabase/admin")

    const supabase = await createClient()
    const authData = await supabase.auth.getUser()
    const user = authData.data?.user

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const admin = createAdminClient()

    // Obtener arrendatarios con contrato activo
    const { data: contratosActivos, error: errorContratos } = await admin
      .from("contratos")
      .select("arrendatario_id")
      .eq("estado", "activo")

    if (errorContratos) {
      console.error("❌ Error obteniendo contratos activos:", errorContratos)
      return NextResponse.json({ error: errorContratos.message }, { status: 500 })
    }

    // IDs de arrendatarios con contrato activo
    const arrendatariosOcupados = new Set(
      (contratosActivos || []).map(c => c.arrendatario_id)
    )

    // Obtener todos los arrendatarios
    const { data: todosArrendatarios, error: errorArrendatarios } = await admin
      .from("arrendatarios")
      .select("id, nombre, cedula, email, celular")
      .order("created_at", { ascending: false })

    if (errorArrendatarios) {
      console.error("❌ Error obteniendo arrendatarios:", errorArrendatarios)
      return NextResponse.json({ error: errorArrendatarios.message }, { status: 500 })
    }

    // Filtrar arrendatarios sin contrato activo
    const arrendatariosDisponibles = (todosArrendatarios || []).filter(
      a => !arrendatariosOcupados.has(a.id)
    )

    console.log("✓ Arrendatarios disponibles:", arrendatariosDisponibles.length, "de", todosArrendatarios?.length || 0)

    return NextResponse.json(arrendatariosDisponibles)

  } catch (err: any) {
    console.error("❌ ERROR GENERAL:", err?.message || err)
    return NextResponse.json(
      { error: "Error interno del servidor", details: err?.message },
      { status: 500 }
    )
  }
}
