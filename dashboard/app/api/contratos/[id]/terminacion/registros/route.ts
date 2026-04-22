import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB post-compresión
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

async function verificarYObtenerTerminacion(contratoId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }

  const role = await getUserRole(supabase, user)
  if (!role || (role !== "admin" && role !== "propietario")) {
    return { error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) }
  }

  const admin = createAdminClient()
  const { data: contrato } = await admin
    .from("contratos")
    .select("id, user_id")
    .eq("id", contratoId)
    .single()

  if (!contrato) {
    return { error: NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 }) }
  }

  if (role === "propietario" && contrato.user_id !== user.id) {
    return { error: NextResponse.json({ error: "Sin permiso sobre este contrato" }, { status: 403 }) }
  }

  let { data: terminacion } = await admin
    .from("terminaciones_contrato")
    .select("id")
    .eq("contrato_id", contratoId)
    .maybeSingle()

  if (!terminacion) {
    const { data: nueva, error } = await admin
      .from("terminaciones_contrato")
      .insert({ contrato_id: contratoId })
      .select("id")
      .single()
    if (error) {
      return { error: NextResponse.json({ error: error.message }, { status: 500 }) }
    }
    terminacion = nueva
  }

  return { admin, contrato, terminacion, supabase, user }
}

// GET - Listar registros
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id
  const ctx = await verificarYObtenerTerminacion(contratoId)
  if ("error" in ctx) return ctx.error

  const { data, error } = await ctx.admin
    .from("terminacion_registros")
    .select("*")
    .eq("terminacion_id", ctx.terminacion.id)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST - Crear un registro (multipart con foto)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id
  const ctx = await verificarYObtenerTerminacion(contratoId)
  if ("error" in ctx) return ctx.error

  const formData = await request.formData()
  const descripcion = String(formData.get("descripcion") || "").trim()
  const valor = Number(formData.get("valor") || 0)
  const archivo = formData.get("archivo") as File | null

  if (!descripcion) {
    return NextResponse.json({ error: "La descripción es obligatoria" }, { status: 400 })
  }

  let fotoUrl: string | null = null

  if (archivo && archivo.size > 0) {
    if (!ALLOWED_TYPES.includes(archivo.type)) {
      return NextResponse.json({ error: "Tipo de imagen no permitido" }, { status: 400 })
    }
    if (archivo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "La imagen supera 2MB. Se debe comprimir antes de subir." },
        { status: 400 }
      )
    }

    const ext = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg"
    const nombre = `${Date.now()}_${crypto.randomUUID()}.${ext}`
    const storagePath = `terminaciones/${contratoId}/${nombre}`

    const arrayBuffer = await archivo.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    const { data: upload, error: upErr } = await ctx.supabase.storage
      .from("documentos")
      .upload(storagePath, bytes, { contentType: archivo.type, upsert: false })

    if (upErr) {
      return NextResponse.json({ error: "Error subiendo la imagen" }, { status: 500 })
    }

    fotoUrl = upload.path
  }

  const { data: maxOrden } = await ctx.admin
    .from("terminacion_registros")
    .select("orden")
    .eq("terminacion_id", ctx.terminacion.id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle()

  const siguiente = (maxOrden?.orden ?? -1) + 1

  const { data, error } = await ctx.admin
    .from("terminacion_registros")
    .insert({
      terminacion_id: ctx.terminacion.id,
      descripcion,
      valor: isFinite(valor) ? valor : 0,
      foto_url: fotoUrl,
      orden: siguiente,
    })
    .select()
    .single()

  if (error) {
    if (fotoUrl) await ctx.supabase.storage.from("documentos").remove([fotoUrl])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
