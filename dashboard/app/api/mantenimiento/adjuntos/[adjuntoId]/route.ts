import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { handleSupabaseError } from "@/lib/api-error"

const BUCKET = "mantenimiento-adjuntos"

/**
 * GET /api/mantenimiento/adjuntos/[adjuntoId]
 * Devuelve una signed URL válida por 60 minutos para ver/descargar el archivo.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ adjuntoId: string }> }
) {
  const { adjuntoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  const { data: adjunto, error: errAdj } = await admin
    .from("mantenimiento_adjuntos")
    .select(`
      id, storage_path, nombre_archivo, tipo,
      mantenimiento_gestiones (
        solicitud_id,
        solicitudes_mantenimiento ( propiedades ( user_id ) )
      )
    `)
    .eq("id", adjuntoId)
    .single()

  if (errAdj || !adjunto) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const gestion = adjunto.mantenimiento_gestiones as {
    solicitud_id: string
    solicitudes_mantenimiento: { propiedades: { user_id?: string } | null } | null
  } | null

  if (role === "propietario") {
    const propUserId = gestion?.solicitudes_mantenimiento?.propiedades?.user_id
    if (propUserId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: signedData, error: errSign } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(adjunto.storage_path, 3600)

  if (errSign || !signedData) {
    return NextResponse.json({ error: "Could not generate signed URL" }, { status: 500 })
  }

  return NextResponse.json({ url: signedData.signedUrl, nombre_archivo: adjunto.nombre_archivo })
}

/**
 * DELETE /api/mantenimiento/adjuntos/[adjuntoId]
 * Borra un adjunto del storage y de la base de datos.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ adjuntoId: string }> }
) {
  const { adjuntoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  const { data: adjunto, error: errAdj } = await admin
    .from("mantenimiento_adjuntos")
    .select(`
      id, storage_path,
      mantenimiento_gestiones (
        solicitudes_mantenimiento ( propiedades ( user_id ) )
      )
    `)
    .eq("id", adjuntoId)
    .single()

  if (errAdj || !adjunto) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const gestion = adjunto.mantenimiento_gestiones as {
    solicitudes_mantenimiento: { propiedades: { user_id?: string } | null } | null
  } | null

  if (role === "propietario") {
    const propUserId = gestion?.solicitudes_mantenimiento?.propiedades?.user_id
    if (propUserId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await admin.storage.from(BUCKET).remove([adjunto.storage_path])

  const { error: errDel } = await admin
    .from("mantenimiento_adjuntos")
    .delete()
    .eq("id", adjuntoId)

  if (errDel) return handleSupabaseError("adjuntos DELETE", errDel)

  return NextResponse.json({ ok: true })
}
