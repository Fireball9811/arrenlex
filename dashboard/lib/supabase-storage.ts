import { createClient } from "./supabase/client"

/**
 * Sube una imagen directamente a Supabase Storage desde el cliente
 * Esto evita el límite de 10MB de Next.js en API Routes
 */
export async function uploadImageToSupabase(
  file: File,
  propiedadId: string,
  categoria: string,
  userId: string
): Promise<{ url: string; path: string }> {
  const supabase = createClient()

  const fileExt = file.name.split(".").pop()
  const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const storagePath = `${userId}/${propiedadId}/${categoria}/${safeFileName}`

  console.log("Subiendo a Supabase:", { storagePath, fileName: file.name, fileSize: file.size })

  const { data, error } = await supabase.storage
    .from("propiedades")
    .upload(storagePath, file)

  if (error) {
    console.error("Error subiendo a Supabase:", error)
    throw new Error(`Error al subir imagen: ${error.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from("propiedades")
    .getPublicUrl(storagePath)

  if (!publicUrl) {
    throw new Error("No se pudo obtener la URL pública de la imagen")
  }

  console.log("Imagen subida exitosamente:", publicUrl)

  return { url: publicUrl, path: storagePath }
}

/**
 * Sube un video directamente a Supabase Storage desde el cliente
 */
export async function uploadVideoToSupabase(
  file: File,
  propiedadId: string,
  userId: string
): Promise<{ url: string; path: string }> {
  const supabase = createClient()

  const fileExt = file.name.split(".").pop()
  const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const storagePath = `${userId}/${propiedadId}/video/${safeFileName}`

  console.log("Subiendo video a Supabase:", { storagePath, fileName: file.name, fileSize: file.size })

  const { data, error } = await supabase.storage
    .from("propiedades")
    .upload(storagePath, file)

  if (error) {
    console.error("Error subiendo video a Supabase:", error)
    throw new Error(`Error al subir video: ${error.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from("propiedades")
    .getPublicUrl(storagePath)

  if (!publicUrl) {
    throw new Error("No se pudo obtener la URL pública del video")
  }

  console.log("Video subido exitosamente:", publicUrl)

  return { url: publicUrl, path: storagePath }
}
