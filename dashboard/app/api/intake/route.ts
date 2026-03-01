import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Devuelve todos los registros de arrenlex_form_intake.
 * Hace JOIN con propiedades usando matricula_inmobiliaria = id_inmueble
 * para traer valor_arriendo junto a cada registro.
 * Solo accesible para admin.
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
  if (role !== "admin") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Traer todos los registros de intake
  const { data: intakeData, error: intakeError } = await admin
    .from("arrenlex_form_intake")
    .select("*")
    .order("created_at", { ascending: false })

  if (intakeError) {
    console.error("[intake GET]", intakeError)
    return NextResponse.json({ error: "Error al obtener registros" }, { status: 500 })
  }

  if (!intakeData || intakeData.length === 0) {
    return NextResponse.json([])
  }

  // Recopilar las matriculas de inmueble presentes para hacer lookup en propiedades
  const matriculas = intakeData
    .map((r) => r.id_inmueble)
    .filter((m): m is string => !!m)

  let canonPorMatricula: Record<string, number> = {}

  if (matriculas.length > 0) {
    const { data: propiedades } = await admin
      .from("propiedades")
      .select("matricula_inmobiliaria, valor_arriendo")
      .in("matricula_inmobiliaria", matriculas)

    if (propiedades) {
      for (const p of propiedades) {
        if (p.matricula_inmobiliaria) {
          canonPorMatricula[p.matricula_inmobiliaria] = p.valor_arriendo
        }
      }
    }
  }

  // Adjuntar valor_arriendo a cada registro
  const resultado = intakeData.map((r) => ({
    ...r,
    valor_arriendo: r.id_inmueble ? (canonPorMatricula[r.id_inmueble] ?? null) : null,
  }))

  return NextResponse.json(resultado)
}
