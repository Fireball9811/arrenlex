import { createClient } from "./supabase/client"

const COMPRESS_MAX_PX  = 1920   // ancho/alto máximo en píxeles
const COMPRESS_QUALITY = 0.85   // calidad WebP (0-1)
const COMPRESS_MAX_KB  = 800    // si el resultado supera esto, reduce calidad

/**
 * Comprime una imagen usando Canvas antes de subirla.
 * - Redimensiona a máx. 1920px manteniendo proporción
 * - Exporta como WebP al 85% de calidad
 * - Si el resultado aún supera 800 KB, reduce a 70%
 * - Si Canvas falla por cualquier motivo, retorna el archivo original
 */
async function comprimirImagen(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    // Calcular dimensiones respetando la proporción
    let newW = width
    let newH = height
    if (width > COMPRESS_MAX_PX || height > COMPRESS_MAX_PX) {
      if (width >= height) {
        newW = COMPRESS_MAX_PX
        newH = Math.round((height / width) * COMPRESS_MAX_PX)
      } else {
        newH = COMPRESS_MAX_PX
        newW = Math.round((width / height) * COMPRESS_MAX_PX)
      }
    }

    const canvas = document.createElement("canvas")
    canvas.width  = newW
    canvas.height = newH
    const ctx = canvas.getContext("2d")
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, newW, newH)
    bitmap.close()

    // Intentar con calidad alta primero
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/webp", COMPRESS_QUALITY)
    )
    if (!blob) return file

    // Si aún pesa más de 800 KB, una segunda pasada con calidad reducida
    const finalBlob = blob.size > COMPRESS_MAX_KB * 1024
      ? await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), "image/webp", 0.70)
        ) ?? blob
      : blob

    const baseName = file.name.replace(/\.[^.]+$/, "")
    return new File([finalBlob], `${baseName}.webp`, { type: "image/webp" })
  } catch {
    // Fallback: si Canvas falla por cualquier motivo, sube el original
    return file
  }
}

/**
 * Sube una imagen directamente a Supabase Storage desde el cliente.
 * Comprime automáticamente a WebP antes de subir.
 * Esto evita el límite de 10MB de Next.js en API Routes.
 */
export async function uploadImageToSupabase(
  file: File,
  propiedadId: string,
  categoria: string,
  userId: string
): Promise<{ url: string; path: string }> {
  const supabase = createClient()

  const compressed = await comprimirImagen(file)
  const fileExt = compressed.name.split(".").pop()
  const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const storagePath = `${userId}/${propiedadId}/${categoria}/${safeFileName}`

  console.log("Subiendo a Supabase:", {
    storagePath,
    originalSize: `${(file.size / 1024).toFixed(0)} KB`,
    compressedSize: `${(compressed.size / 1024).toFixed(0)} KB`,
    ratio: `${Math.round((1 - compressed.size / file.size) * 100)}% reducción`,
  })

  const { data, error } = await supabase.storage
    .from("propiedades")
    .upload(storagePath, compressed)

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
