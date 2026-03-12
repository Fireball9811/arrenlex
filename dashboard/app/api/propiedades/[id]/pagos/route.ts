import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/propiedades/[id]/pagos
 * Obtiene los pagos de una propiedad específica
 * Admin: puede ver pagos de cualquier propiedad
 * Propietario: solo puede ver pagos de sus propiedades
 */
export async function GET(
  _request: Request,
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
    return NextResponse.json(
      { error: "Solo administradores o propietarios pueden ver pagos" },
      { status: 403 }
    )
  }

  const admin = createAdminClient()

  // Si es propietario, verificar que la propiedad le pertenece
  if (role === "propietario") {
    const { data: propiedad, error: propError } = await admin
      .from("propiedades")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (propError || !propiedad) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
    }
  }

  // Obtener pagos
  const { data: pagos, error } = await admin
    .from("pagos")
    .select("*")
    .eq("propiedad_id", id)
    .order("fecha_pago", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(pagos ?? [])
}
