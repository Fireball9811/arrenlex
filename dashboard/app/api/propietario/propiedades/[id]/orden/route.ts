import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * PATCH /api/propietario/propiedades/[id]/orden
 * Body: { orden_display: number | null }
 */
export async function PATCH(
  request: Request,
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
  if (role !== "propietario") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  let body: { orden_display?: number | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const { orden_display } = body

  if (orden_display !== null && orden_display !== undefined) {
    if (!Number.isInteger(orden_display) || orden_display < 1) {
      return NextResponse.json(
        { error: "orden_display debe ser un entero positivo o null" },
        { status: 400 }
      )
    }
  }

  const admin = createAdminClient()

  const { data: propiedad, error: findError } = await admin
    .from("propiedades")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (findError || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  const valor = orden_display === undefined ? null : orden_display

  const { data, error } = await admin
    .from("propiedades")
    .update({ orden_display: valor })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, orden_display")
    .single()

  if (error) {
    console.error("[propiedades orden PATCH]", error)
    const faltaColumna =
      error.code === "42703" ||
      (error.message ?? "").toLowerCase().includes("orden_display")
    return NextResponse.json(
      {
        error: faltaColumna
          ? "La columna orden_display aún no existe. Aplica la migración 070 en Supabase."
          : "Error al guardar orden",
      },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
