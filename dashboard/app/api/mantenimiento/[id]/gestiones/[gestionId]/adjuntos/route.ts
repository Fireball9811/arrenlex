import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { handleSupabaseError } from "@/lib/api-error"

const BUCKET = "mantenimiento-adjuntos"
const MAX_SIZE_MB = 10

/**
 * POST /api/mantenimiento/[id]/gestiones/[gestionId]/adjuntos
 * Sube un archivo adjunto a una gestión. multipart/form-data: file, tipo?
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; gestionId: string }> }
) {
  const { id, gestionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  // Verificar que la gestión pertenece a la solicitud y al propietario
  const { data: gestion, error: errG } = await admin
    .from("mantenimiento_gestiones")
    .select("id, solicitud_id, solicitudes_mantenimiento ( propiedades ( user_id ) )")
    .eq("id", gestionId)
    .eq("solicitud_id", id)
    .single()

  if (errG || !gestion) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const solicitud = gestion.solicitudes_mantenimiento as {
    propiedades: { user_id?: string } | null
  } | null
  if (role === "propietario" && solicitud?.propiedades?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const tipo = (formData.get("tipo") as string) || "factura"

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const maxBytes = MAX_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `File exceeds ${MAX_SIZE_MB}MB limit` }, { status: 400 })
  }

  // Generar path único: solicitud_id/gestion_id/timestamp_filename
  const ext = file.name.split(".").pop() ?? "bin"
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `${id}/${gestionId}/${Date.now()}_${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: errUpload } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (errUpload) {
    console.error("[adjuntos POST] Storage upload error:", errUpload)
    return NextResponse.json({ error: "Error uploading file" }, { status: 500 })
  }

  const { data: inserted, error: errInsert } = await admin
    .from("mantenimiento_adjuntos")
    .insert({
      gestion_id: gestionId,
      nombre_archivo: file.name,
      storage_path: storagePath,
      tipo: ["factura", "foto", "otro"].includes(tipo) ? tipo : "otro",
    })
    .select("id")
    .single()

  if (errInsert) {
    // Limpiar el archivo del storage si falla el insert
    await admin.storage.from(BUCKET).remove([storagePath])
    return handleSupabaseError("adjuntos POST insert", errInsert)
  }

  return NextResponse.json({ id: inserted?.id, storage_path: storagePath, ok: true }, { status: 201 })
}
