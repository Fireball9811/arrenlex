import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import {
  arrendatariosDelPropietario,
  requireAdminOrPropietarioRole,
} from "@/lib/auth/resource-access"

/**
 * GET - Arrendatarios sin contrato activo en el alcance del usuario.
 * Admin: global. Propietario: solo los vinculados a sus contratos/propiedades.
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
  const denied = requireAdminOrPropietarioRole(role)
  if (denied) return denied

  const admin = createAdminClient()

  try {
    if (role === "admin") {
      const { data: contratosActivos, error: errorContratos } = await admin
        .from("contratos")
        .select("arrendatario_id")
        .eq("estado", "activo")

      if (errorContratos) {
        return NextResponse.json({ error: errorContratos.message }, { status: 500 })
      }

      const ocupados = new Set((contratosActivos ?? []).map((c) => c.arrendatario_id))

      const { data: todosArrendatarios, error: errorArrendatarios } = await admin
        .from("arrendatarios")
        .select("id, nombre, cedula, email, celular")
        .order("created_at", { ascending: false })

      if (errorArrendatarios) {
        return NextResponse.json({ error: errorArrendatarios.message }, { status: 500 })
      }

      const disponibles = (todosArrendatarios ?? []).filter((a) => !ocupados.has(a.id))
      return NextResponse.json(disponibles)
    }

    const { data: props } = await admin
      .from("propiedades")
      .select("id")
      .eq("user_id", user.id)

    const propiedadIds = props?.map((p) => p.id) ?? []
    if (propiedadIds.length === 0) {
      return NextResponse.json([])
    }

    const enScope = await arrendatariosDelPropietario(admin, user.id)

    const { data: contratosActivos, error: errorContratos } = await admin
      .from("contratos")
      .select("arrendatario_id")
      .in("propiedad_id", propiedadIds)
      .in("estado", ["activo", "borrador"])

    if (errorContratos) {
      return NextResponse.json({ error: errorContratos.message }, { status: 500 })
    }

    const ocupados = new Set((contratosActivos ?? []).map((c) => c.arrendatario_id))
    const disponibles = enScope.filter((a) => !ocupados.has(a.id))

    return NextResponse.json(disponibles)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno"
    console.error("[arrendatarios/disponibles]", message)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
