import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Devuelve registros de arrenlex_form_intake.
 * - Admin: ve todos los registros
 * - Propietario: ve solo registros de sus propiedades
 * Hace JOIN con propiedades para traer valor_arriendo junto a cada registro.
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
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Traer registros de intake según el rol
  let intakeQuery = admin
    .from("arrenlex_form_intake")
    .select("*")

  if (role === "propietario") {
    // Para propietarios, primero obtener sus propiedades
    const { data: propiedades } = await admin
      .from("propiedades")
      .select("id")
      .eq("user_id", user.id)

    if (!propiedades || propiedades.length === 0) {
      return NextResponse.json([])
    }

    const propiedadIds = propiedades.map(p => p.id)
    intakeQuery = intakeQuery.in("propiedad_id", propiedadIds)
  }

  const { data: intakeData, error: intakeError } = await intakeQuery
    .order("created_at", { ascending: false })

  if (intakeError) {
    console.error("[intake GET]", intakeError)
    return NextResponse.json({ error: "Error al obtener registros" }, { status: 500 })
  }

  if (!intakeData || intakeData.length === 0) {
    return NextResponse.json([])
  }

  // Recopilar propiedad_ids presentes para hacer lookup en propiedades
  const propiedadIds = intakeData
    .map((r) => r.propiedad_id)
    .filter((id): id is string => typeof id === "string" && !!id)

  let canonPorPropiedad: Record<string, number> = {}

  if (propiedadIds.length > 0) {
    const { data: propiedades } = await admin
      .from("propiedades")
      .select("id, valor_arriendo, direccion, ciudad")
      .in("id", propiedadIds)

    if (propiedades) {
      for (const p of propiedades) {
        canonPorPropiedad[p.id] = p.valor_arriendo
      }
    }
  }

  // Recopilar cédulas para buscar rechazos previos (misma cédula ya descartada)
  const cedulas = [
    ...new Set(
      intakeData
        .map((r) => (typeof r.cedula === "string" ? r.cedula.trim() : ""))
        .filter((c): c is string => c.length > 0)
    ),
  ]

  type RechazoPrevio = {
    id: string
    cedula: string | null
    motivo_descarte: string | null
    descartado_at: string | null
    propiedad_id: string | null
  }

  let rechazosPorCedula: Record<string, RechazoPrevio[]> = {}

  if (cedulas.length > 0) {
    const { data: rechazos } = await admin
      .from("arrenlex_form_intake")
      .select("id, cedula, motivo_descarte, descartado_at, propiedad_id")
      .in("cedula", cedulas)
      .eq("descartado", true)

    if (rechazos) {
      for (const rp of rechazos as RechazoPrevio[]) {
        const key = rp.cedula ?? ""
        if (!key) continue
        if (!rechazosPorCedula[key]) rechazosPorCedula[key] = []
        rechazosPorCedula[key].push(rp)
      }
    }
  }

  // Adjuntar valor_arriendo + rechazos_previos a cada registro
  const resultado = intakeData.map((r) => {
    const cedulaKey = typeof r.cedula === "string" ? r.cedula.trim() : ""
    const rechazosPrevios = cedulaKey
      ? (rechazosPorCedula[cedulaKey] ?? []).filter((x) => x.id !== r.id)
      : []

    return {
      ...r,
      valor_arriendo: r.propiedad_id ? (canonPorPropiedad[r.propiedad_id] ?? null) : null,
      rechazos_previos: rechazosPrevios.map(({ id, motivo_descarte, descartado_at, propiedad_id }) => ({
        id,
        motivo_descarte,
        descartado_at,
        propiedad_id,
      })),
    }
  })

  return NextResponse.json(resultado)
}
