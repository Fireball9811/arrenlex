import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { handleSupabaseError } from "@/lib/api-error"

/**
 * PATCH /api/mantenimiento/[id]/gestiones/[gestionId]
 * Actualiza descripcion, proveedor, costo, fecha_ejecucion de una gestión.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; gestionId: string }> }
) {
  const { id, gestionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar acceso
  const { data: gestion, error: errG } = await admin
    .from("mantenimiento_gestiones")
    .select("id, solicitud_id, solicitudes_mantenimiento ( propiedad_id, propiedades ( user_id ) )")
    .eq("id", gestionId)
    .eq("solicitud_id", id)
    .single()

  if (errG || !gestion) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const solicitud = (gestion.solicitudes_mantenimiento as unknown) as {
    propiedad_id: string
    propiedades: { user_id?: string } | null
  } | null
  if (role === "propietario" && solicitud?.propiedades?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { fecha_ejecucion, descripcion, proveedor, costo } = body as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  if (fecha_ejecucion !== undefined) updates.fecha_ejecucion = String(fecha_ejecucion)
  if (descripcion !== undefined) updates.descripcion = String(descripcion).trim()
  if (proveedor !== undefined) updates.proveedor = proveedor ? String(proveedor).trim() : null
  if (costo !== undefined) {
    const c = parseFloat(String(costo).replace(/[^0-9.]/g, ""))
    if (!isNaN(c) && c >= 0) updates.costo = c
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const { error: errUpdate } = await admin
    .from("mantenimiento_gestiones")
    .update(updates)
    .eq("id", gestionId)

  if (errUpdate) return handleSupabaseError("gestiones PATCH", errUpdate)

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/mantenimiento/[id]/gestiones/[gestionId]
 * Elimina una gestión y sus adjuntos del storage.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; gestionId: string }> }
) {
  const { id, gestionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  const { data: gestion, error: errG } = await admin
    .from("mantenimiento_gestiones")
    .select(`
      id, solicitud_id,
      solicitudes_mantenimiento ( propiedades ( user_id ) ),
      mantenimiento_adjuntos ( storage_path )
    `)
    .eq("id", gestionId)
    .eq("solicitud_id", id)
    .single()

  if (errG || !gestion) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const solicitud = (gestion.solicitudes_mantenimiento as unknown) as {
    propiedades: { user_id?: string } | null
  } | null
  if (role === "propietario" && solicitud?.propiedades?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Borrar archivos del storage
  const adjuntos = gestion.mantenimiento_adjuntos as { storage_path: string }[] | null
  if (adjuntos && adjuntos.length > 0) {
    const paths = adjuntos.map((a) => a.storage_path)
    await admin.storage.from("mantenimiento-adjuntos").remove(paths)
  }

  const { error: errDel } = await admin
    .from("mantenimiento_gestiones")
    .delete()
    .eq("id", gestionId)

  if (errDel) return handleSupabaseError("gestiones DELETE", errDel)

  return NextResponse.json({ ok: true })
}
