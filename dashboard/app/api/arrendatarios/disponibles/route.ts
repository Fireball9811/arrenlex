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
export async function GET(request: Request) {
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
  const propiedadId = new URL(request.url).searchParams.get("propiedad_id")

  const priorizarPostulante = async <
    T extends { id: string; email?: string | null; cedula?: string | null }
  >(
    lista: T[],
    propId: string | null
  ): Promise<T[]> => {
    if (!propId || lista.length <= 1) return lista

    const { data: intakeRows } = await admin
      .from("arrenlex_form_intake")
      .select("email, cedula")
      .eq("propiedad_id", propId)
      .order("created_at", { ascending: false })
      .limit(1)

    const intake = intakeRows?.[0]
    if (!intake) return lista

    const intakeEmail = typeof intake.email === "string" ? intake.email.trim().toLowerCase() : ""
    const intakeCedula = typeof intake.cedula === "string" ? intake.cedula.trim() : ""

    const index = lista.findIndex((a) => {
      const email = typeof a.email === "string" ? a.email.trim().toLowerCase() : ""
      const cedula = typeof a.cedula === "string" ? a.cedula.trim() : ""
      return (intakeEmail && email && intakeEmail === email) || (intakeCedula && cedula && intakeCedula === cedula)
    })

    if (index <= 0) return lista
    const candidato = lista[index]
    return [candidato, ...lista.slice(0, index), ...lista.slice(index + 1)]
  }

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

      const disponiblesBase = (todosArrendatarios ?? []).filter((a) => !ocupados.has(a.id))
      const disponibles = await priorizarPostulante(disponiblesBase, propiedadId)
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

    const [enScope, propiosDirectosRes] = await Promise.all([
      arrendatariosDelPropietario(admin, user.id),
      admin
        .from("arrendatarios")
        .select("id, email, nombre, cedula")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ])

    const propiosDirectos = propiosDirectosRes.data ?? []
    const mapaCandidatos = new Map<string, (typeof enScope)[number]>()
    for (const a of [...propiosDirectos, ...enScope]) {
      mapaCandidatos.set(a.id, a)
    }

    const { data: contratosActivos, error: errorContratos } = await admin
      .from("contratos")
      .select("arrendatario_id")
      .in("propiedad_id", propiedadIds)
      .in("estado", ["activo", "borrador"])

    if (errorContratos) {
      return NextResponse.json({ error: errorContratos.message }, { status: 500 })
    }

    const ocupados = new Set((contratosActivos ?? []).map((c) => c.arrendatario_id))
    const disponiblesBase = [...mapaCandidatos.values()].filter((a) => !ocupados.has(a.id))
    const disponibles = await priorizarPostulante(disponiblesBase, propiedadId)

    return NextResponse.json(disponibles)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno"
    console.error("[arrendatarios/disponibles]", message)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
