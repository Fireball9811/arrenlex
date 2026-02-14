import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { PropiedadImagen } from "@/lib/types/database"

// GET - Listar imágenes de una propiedad
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const propiedadId = searchParams.get("propiedad_id")

  if (!propiedadId) {
    return NextResponse.json({ error: "propiedad_id requerido" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("propiedades_imagenes")
    .select("*")
    .eq("propiedad_id", propiedadId)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST - Subir nueva imagen
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const formData = await request.formData()
  const propiedadId = formData.get("propiedad_id") as string
  const categoria = formData.get("categoria") as "sala" | "cocina" | "habitacion" | "bano" | "fachada" | "otra"
  const file = formData.get("archivo") as File

  // Validaciones
  if (!propiedadId || !categoria || !file) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: propiedad_id, categoria, archivo" },
      { status: 400 }
    )
  }

  // Verificar que la propiedad pertenezca al usuario
  const { data: propiedad } = await supabase
    .from("propiedades")
    .select("user_id")
    .eq("id", propiedadId)
    .single()

  if (!propiedad || propiedad.user_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso para esta propiedad" }, { status: 403 })
  }

  // Validar tipo de archivo
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido. Solo JPG, PNG o WebP" },
      { status: 400 }
    )
  }

  // Validar tamaño (10MB max)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "El archivo es muy grande. Máximo 10MB" },
      { status: 400 }
    )
  }

  try {
    // Generar nombre de archivo único
    const fileExt = file.name.split(".").pop()
    const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${user.id}/${propiedadId}/${categoria}/${safeFileName}`

    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("propiedades")
      .upload(storagePath, file)

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from("propiedades")
      .getPublicUrl(storagePath)

    // Guardar en la tabla propiedades_imagenes
    const { data: imagenData, error: dbError } = await supabase
      .from("propiedades_imagenes")
      .insert({
        propiedad_id: propiedadId,
        categoria: categoria,
        nombre_archivo: file.name,
        url_publica: publicUrl,
      })
      .select()
      .single()

    if (dbError) {
      // Si falla la inserción, eliminar el archivo subido
      await supabase.storage.from("propiedades").remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json(imagenData)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir imagen" },
      { status: 500 }
    )
  }
}
