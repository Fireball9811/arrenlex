import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

  const { id } = await context.params

  // Obtener la imagen para verificar permisos
  const { data: imagen } = await supabase
    .from("propiedades_imagenes")
    .select("propiedad_id, nombre_archivo")
    .eq("id", id)
    .single()

  if (!imagen) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 })
  }

  // Verificar que la propiedad pertenezca al usuario
  const { data: propiedad } = await supabase
    .from("propiedades")
    .select("user_id")
    .eq("id", imagen.propiedad_id)
    .single()

  if (!propiedad || propiedad.user_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso para eliminar esta imagen" }, { status: 403 })
  }

  // Eliminar de la base de datos
  const { error: dbError } = await supabase
    .from("propiedades_imagenes")
    .delete()
    .eq("id", id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Eliminar del storage
  // El path en storage es: user_id/propiedad_id/categoria/nombre_archivo
  const storagePath = `${user.id}/${imagen.propiedad_id}/${id}/${imagen.nombre_archivo}`

  const { error: storageError } = await supabase.storage
    .from("propiedades")
    .remove([storagePath])

  if (storageError) {
    console.error("Error eliminando archivo del storage:", storageError)
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

  const { id } = await context.params
  const body = await request.json()

  // Obtener la imagen para verificar permisos
  const { data: imagen } = await supabase
    .from("propiedades_imagenes")
    .select("propiedad_id")
    .eq("id", id)
    .single()

  if (!imagen) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 })
  }

  // Verificar que la propiedad pertenezca al usuario
  const { data: propiedad } = await supabase
    .from("propiedades")
    .select("user_id")
    .eq("id", imagen.propiedad_id)
    .single()

  if (!propiedad || propiedad.user_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso" }, { status: 403 })
  }

  // Actualizar orden
  const { data, error } = await supabase
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
