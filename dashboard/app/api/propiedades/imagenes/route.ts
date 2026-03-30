import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
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

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
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

// POST - Subir una o más imágenes
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Solo administradores o propietarios pueden subir imágenes" }, { status: 403 })
  }

  const formData = await request.formData()
  const propiedadId = formData.get("propiedad_id") as string
  const categoria = formData.get("categoria") as string
  const files = formData.getAll("archivo") as File[]

  if (!propiedadId || !categoria || !files || files.length === 0) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: propiedad_id, categoria, archivo" },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  // Obtener la propiedad para verificar permisos y obtener el owner real
  const { data: propiedad } = await adminClient
    .from("propiedades")
    .select("user_id")
    .eq("id", propiedadId)
    .single()

  if (!propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  // Propietario solo puede operar en sus propias propiedades
  if (role === "propietario" && propiedad.user_id !== user.id) {
    return NextResponse.json({ error: "No tienes permiso para esta propiedad" }, { status: 403 })
  }

  // Validar tipo y tamaño de archivos
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  const maxSize = 40 * 1024 * 1024 // 40MB

  for (const file of files) {
    if (file instanceof File) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${file.name}. Solo JPG, PNG o WebP` },
          { status: 400 }
        )
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `El archivo ${file.name} es muy grande. Máximo 40MB` },
          { status: 400 }
        )
      }
    }
  }

  try {
    const resultados = []
    // Usar el user_id del propietario real para la ruta de storage
    const storageOwnerId = propiedad.user_id

    for (const file of files) {
      if (!(file instanceof File)) continue

      const fileExt = file.name.split(".").pop()
      const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const storagePath = `${storageOwnerId}/${propiedadId}/${categoria}/${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from("propiedades")
        .upload(storagePath, file)

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const { data: { publicUrl } } = supabase.storage
        .from("propiedades")
        .getPublicUrl(storagePath)

      const { data: imagenData, error: dbError } = await adminClient
        .from("propiedades_imagenes")
        .insert({
          propiedad_id: propiedadId,
          categoria,
          nombre_archivo: file.name,
          url_publica: publicUrl,
        })
        .select()
        .single()

      if (dbError) {
        await supabase.storage.from("propiedades").remove([storagePath])
        return NextResponse.json({ error: dbError.message }, { status: 500 })
      }

      resultados.push(imagenData)
    }

    return NextResponse.json(resultados)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir imágenes" },
      { status: 500 }
    )
  }
}
