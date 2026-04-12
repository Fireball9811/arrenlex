import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminRole } from "@/lib/auth/role"

const BUCKET = "documentos"
const SIGNED_URL_EXPIRY_SEC = 3600 // 1 hora

/**
 * GET - Lista documentos subidos por un usuario (solo administrador).
 * Los documentos se guardan en storage con ruta user_id/nombre_archivo.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!(await isAdminRole(supabase, user.id))) {
    return NextResponse.json(
      { error: "Solo el administrador puede ver los documentos por usuario" },
      { status: 403 }
    )
  }

  const { id: userId } = await params

  const admin = createAdminClient()

  const { data: listData, error: listError } = await admin.storage
    .from(BUCKET)
    .list(userId, { limit: 500 })

  if (listError) {
    console.error("[admin/usuarios/documentos]", listError)
    return NextResponse.json(
      { error: listError.message || "Error al listar documentos" },
      { status: 500 }
    )
  }

  const files = (listData ?? []).filter((item) => item.name && item.id != null)
  if (files.length === 0) {
    return NextResponse.json({ documentos: [] })
  }

  const paths = files.map((f) => `${userId}/${f.name}`)
  const { data: signedData, error: signedError } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRY_SEC)

  if (signedError) {
    console.error("[admin/usuarios/documentos] signedUrls", signedError)
    return NextResponse.json({
      documentos: files.map((f) => ({ name: f.name, path: `${userId}/${f.name}`, url: null })),
    })
  }

  const documentos = (signedData ?? []).map((item, i) => ({
    name: files[i]?.name ?? item.path?.split("/").pop() ?? "",
    path: item.path,
    url: item.signedUrl ?? null,
  }))

  return NextResponse.json({ documentos })
}
