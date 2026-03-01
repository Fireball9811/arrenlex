import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * PATCH - Marca un registro de intake como gestionado.
 * Solo accesible para admin.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
  const { error } = await admin
    .from("arrenlex_form_intake")
    .update({ gestionado: true })
    .eq("id", id)

  if (error) {
    console.error("[intake PATCH]", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
