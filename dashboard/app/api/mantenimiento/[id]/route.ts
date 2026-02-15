import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

const VALID_STATUSES = ["pendiente", "ejecucion", "completado"] as const

/**
 * PATCH - Actualiza el status y opcionalmente el responsable de una solicitud de mantenimiento.
 * Solo admin o propietario de la propiedad asociada.
 * Body: { status?: 'pendiente' | 'ejecucion' | 'completado', responsable?: string }
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

  const { status, responsable } = body as Record<string, unknown>

  if (status !== undefined) {
    if (typeof status !== "string" || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json(
        { error: "status debe ser uno de: pendiente, ejecucion, completado" },
        { status: 400 }
      )
    }
  }

  const responsableVal =
    responsable !== undefined
      ? typeof responsable === "string"
        ? responsable.trim() || null
        : null
      : undefined

  const admin = createAdminClient()

  const { data: solicitud, error: errSolicitud } = await admin
    .from("solicitudes_mantenimiento")
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

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (responsableVal !== undefined) updates.responsable = responsableVal

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Debes enviar status o responsable" }, { status: 400 })
  }

  const { error: errUpdate } = await admin
    .from("solicitudes_mantenimiento")
    .update(updates)
    .eq("id", id)

  if (errUpdate) {
    console.error("[mantenimiento PATCH]", errUpdate)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...updates })
}
