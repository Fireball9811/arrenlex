import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Obtener el video actual de una propiedad
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from("propiedades_videos")
    .select("*")
    .eq("propiedad_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? null)
}

// POST - Guardar registro del video ya subido al storage
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Solo administradores o propietarios pueden subir videos" }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // Verificar que la propiedad existe y el propietario tiene acceso
  const { data: propiedad } = await adminClient
    .from("propiedades")
    .select("user_id")
    .eq("id", id)
    .single()

  if (!propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  if (role === "propietario" && propiedad.user_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso para esta propiedad" }, { status: 403 })
  }

  const body = await request.json()
  const { nombre_archivo, url_publica, storage_path } = body

  if (!nombre_archivo || !url_publica || !storage_path) {
    return NextResponse.json(
      { error: "Faltan campos: nombre_archivo, url_publica, storage_path" },
      { status: 400 }
    )
  }

  // Eliminar video anterior si existe (solo puede haber 1 por propiedad)
  const { data: videoAnterior } = await adminClient
    .from("propiedades_videos")
    .select("id, storage_path")
    .eq("propiedad_id", id)
    .maybeSingle()

  if (videoAnterior) {
    await adminClient.from("propiedades_videos").delete().eq("id", videoAnterior.id)
    // Intentar eliminar el archivo anterior del storage
    const supabaseBrowser = await createClient()
    await supabaseBrowser.storage.from("propiedades-videos").remove([videoAnterior.storage_path])
  }

  // Guardar el nuevo video
  const { data: videoData, error: dbError } = await adminClient
    .from("propiedades_videos")
    .insert({
      propiedad_id: id,
      nombre_archivo,
      url_publica,
      storage_path,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(videoData)
}

// DELETE - Eliminar el video de una propiedad
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Solo administradores o propietarios pueden eliminar videos" }, { status: 403 })
  }

  const adminClient = createAdminClient()

  const { data: propiedad } = await adminClient
    .from("propiedades")
    .select("user_id")
    .eq("id", id)
    .single()

  if (!propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  if (role === "propietario" && propiedad.user_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso para esta propiedad" }, { status: 403 })
  }

  const { data: video } = await adminClient
    .from("propiedades_videos")
    .select("id, storage_path")
    .eq("propiedad_id", id)
    .maybeSingle()

  if (!video) {
    return NextResponse.json({ error: "No hay video para esta propiedad" }, { status: 404 })
  }

  // Eliminar de BD
  await adminClient.from("propiedades_videos").delete().eq("id", video.id)

  // Eliminar del storage
  const { error: storageError } = await supabase.storage
    .from("propiedades-videos")
    .remove([video.storage_path])

  if (storageError) {
    console.error("Error eliminando video del storage:", storageError)
  }

  return NextResponse.json({ success: true })
}
