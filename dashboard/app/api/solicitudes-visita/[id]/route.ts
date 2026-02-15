import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

const VALID_STATUSES = ["pendiente", "contestado", "esperando"] as const

/**
 * PATCH - Actualiza el status de una solicitud de visita.
 * Solo admin o propietario de la propiedad asociada.
 * Body: { status: 'pendiente' | 'contestado' | 'esperando' }
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
  if (role === "inquilino") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { status } = body as Record<string, unknown>
  if (typeof status !== "string" || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: "status debe ser uno de: pendiente, contestado, esperando" },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: solicitud, error: errSolicitud } = await admin
    .from("solicitudes_visita")
    .select("id, propiedad_id, propiedades ( user_id )")
    .eq("id", id)
    .single()

  if (errSolicitud || !solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
  }

  const prop = solicitud.propiedades as { user_id?: string } | null
  const propUserId = prop?.user_id

  if (role === "propietario" && propUserId !== user.id) {
    return NextResponse.json({ error: "No puedes modificar esta solicitud" }, { status: 403 })
  }

  const { error: errUpdate } = await admin
    .from("solicitudes_visita")
    .update({ status })
    .eq("id", id)

  if (errUpdate) {
    console.error("[solicitudes-visita PATCH]", errUpdate)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status })
}
