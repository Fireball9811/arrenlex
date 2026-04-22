import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

// POST - Marcar la propiedad del contrato como disponible, sin cerrar el contrato
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

  if (!contrato.propiedad_id) {
    return NextResponse.json({ error: "El contrato no tiene propiedad asociada" }, { status: 400 })
  }

  const { error } = await admin
    .from("propiedades")
    .update({ estado: "disponible" })
    .eq("id", contrato.propiedad_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
