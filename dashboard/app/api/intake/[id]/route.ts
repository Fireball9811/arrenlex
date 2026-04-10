import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * PATCH - Marca un registro de intake como gestionado.
 * Admin: puede marcar cualquier registro
 * Propietario: solo puede marcar registros de sus propiedades
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
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Si es propietario, verificar que el registro pertenezca a su propiedad
  if (role === "propietario") {
    const { data: intake } = await admin
      .from("arrenlex_form_intake")
      .select("propiedad_id, propiedades!inner(user_id)")
      .eq("id", id)
      .maybeSingle()

    if (!intake) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    const propiedad = Array.isArray(intake.propiedades)
      ? intake.propiedades[0]
      : intake.propiedades

    if (!propiedad || propiedad.user_id !== user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para marcar este registro como gestionado" },
        { status: 403 }
      )
    }
  }

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
