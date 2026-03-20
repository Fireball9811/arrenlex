import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

interface RouteContext {
  params: Promise<{ id: string }>
}

// DELETE - Eliminar una imagen
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Solo administradores o propietarios pueden eliminar imágenes" }, { status: 403 })
  }

  const { id } = await context.params
  const adminClient = createAdminClient()

  // Obtener la imagen
  const { data: imagen } = await adminClient
    .from("propiedades_imagenes")
    .select("propiedad_id, nombre_archivo, url_publica")
    .eq("id", id)
    .single()

  if (!imagen) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 })
  }

  // Verificar permisos sobre la propiedad
  const { data: propiedad } = await adminClient
    .from("propiedades")
    .select("user_id")
    .eq("id", imagen.propiedad_id)
    .single()

  if (!propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  if (role === "propietario" && propiedad.user_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso para eliminar esta imagen" }, { status: 403 })
  }

  // Eliminar de la base de datos
  const { error: dbError } = await adminClient
    .from("propiedades_imagenes")
    .delete()
    .eq("id", id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Extraer el path de storage desde la url_publica
  // URL formato: https://xxx.supabase.co/storage/v1/object/public/propiedades/owner_id/prop_id/cat/filename
  try {
    const url = new URL(imagen.url_publica)
    const marker = "/storage/v1/object/public/propiedades/"
    const idx = url.pathname.indexOf(marker)
    if (idx !== -1) {
      const storagePath = decodeURIComponent(url.pathname.slice(idx + marker.length))
      await supabase.storage.from("propiedades").remove([storagePath])
    }
  } catch {
    console.error("No se pudo eliminar el archivo del storage para imagen:", id)
  }

  return NextResponse.json({ success: true })
}

// PATCH - Actualizar orden de imágenes
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Solo administradores o propietarios pueden modificar imágenes" }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json()
  const adminClient = createAdminClient()

  // Obtener la imagen para verificar permisos
  const { data: imagen } = await adminClient
    .from("propiedades_imagenes")
    .select("propiedad_id")
    .eq("id", id)
    .single()

  if (!imagen) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 })
  }

  // Propietario: verificar que la propiedad es suya
  if (role === "propietario") {
    const { data: propiedad } = await adminClient
      .from("propiedades")
      .select("user_id")
      .eq("id", imagen.propiedad_id)
      .single()

    if (!propiedad || propiedad.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso" }, { status: 403 })
    }
  }

  const { data, error } = await adminClient
    .from("propiedades_imagenes")
    .update({ orden: body.orden })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
