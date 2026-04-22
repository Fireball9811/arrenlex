import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (!role || (role !== "admin" && role !== "propietario")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: contrato } = await admin
    .from("contratos")
    .select("id, user_id, propiedad_id")
    .eq("id", contratoId)
    .single()

  if (!contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  if (role === "propietario" && contrato.user_id !== user.id) {
    return NextResponse.json({ error: "Sin permiso sobre este contrato" }, { status: 403 })
  }

  const { data: terminacion } = await admin
    .from("terminaciones_contrato")
    .select("id")
    .eq("contrato_id", contratoId)
    .maybeSingle()

  if (!terminacion) {
    return NextResponse.json(
      { error: "Debes guardar la terminación antes de finalizar" },
      { status: 400 }
    )
  }

  const ahora = new Date().toISOString()

  const { error: errTerm } = await admin
    .from("terminaciones_contrato")
    .update({ finalizado: true, finalizado_en: ahora })
    .eq("id", terminacion.id)

  if (errTerm) return NextResponse.json({ error: errTerm.message }, { status: 500 })

  const { error: errContrato } = await admin
    .from("contratos")
    .update({ estado: "terminado" })
    .eq("id", contratoId)

  if (errContrato) return NextResponse.json({ error: errContrato.message }, { status: 500 })

  if (contrato.propiedad_id) {
    await admin
      .from("propiedades")
      .update({ estado: "disponible" })
      .eq("id", contrato.propiedad_id)
  }

  return NextResponse.json({ ok: true })
}
