import { NextResponse } from "next/server"
import { requireAdminOrPropietario } from "@/lib/habeas-data/route-auth"
import { getPropietarioPropiedadIds } from "@/lib/habeas-data/intake-access"

const INTAKE_FIELDS =
  "id, nombre, email, cedula, propiedad_id, created_at"

/**
 * GET — Busca solicitudes de arrendamiento por nombre, cédula o email (máx. 25).
 * Admin: todas las coincidencias. Propietario: solo intakes de sus propiedades.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrPropietario()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const esc = q.replace(/%/g, "\\%").replace(/_/g, "\\_")

  let query = auth.ctx.admin
    .from("arrenlex_form_intake")
    .select(INTAKE_FIELDS)
    .or(`nombre.ilike.%${esc}%,cedula.ilike.%${esc}%,email.ilike.%${esc}%`)
    .order("created_at", { ascending: false })
    .limit(25)

  if (auth.ctx.role === "propietario") {
    const ids = await getPropietarioPropiedadIds(auth.ctx.admin, auth.ctx.userId)
    if (ids.length === 0) {
      return NextResponse.json({ results: [] })
    }
    query = query.in("propiedad_id", ids)
  }

  const { data, error } = await query

  if (error) {
    console.error("[habeas-data buscar-intake]", error)
    return NextResponse.json({ error: "Error en búsqueda" }, { status: 500 })
  }

  const results = (data ?? []).map((r: Record<string, unknown>) => {
    const { propiedad_id: _x, ...rest } = r
    return rest
  })

  return NextResponse.json({ results })
}
