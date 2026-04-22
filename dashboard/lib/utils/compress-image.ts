// Utilidad para comprimir imágenes en el navegador usando Canvas.
// Redimensiona si el lado mayor excede maxSide y re-codifica como JPEG.
// Objetivo: mantener fotos de cámara por debajo de ~500KB sin depender de librerías externas.

export type CompressOptions = {
  maxSide?: number // default 1280
  quality?: number // default 0.72
  mimeType?: "image/jpeg" | "image/webp" // default image/jpeg
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const maxSide = opts.maxSide ?? 1280
  const quality = opts.quality ?? 0.72
  const mimeType = opts.mimeType ?? "image/jpeg"

  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo no es una imagen")
  }

  const bitmap = await loadBitmap(file)

  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const targetWidth = Math.round(bitmap.width * ratio)
  const targetHeight = Math.round(bitmap.height * ratio)

  const canvas = document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo obtener contexto 2D")

  // Fondo blanco para preservar transparencias al pasar a JPEG
  if (mimeType === "image/jpeg") {
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, targetWidth, targetHeight)
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo generar el blob"))),
      mimeType,
      quality
    )
  })

  const ext = mimeType === "image/webp" ? "webp" : "jpg"
  const baseName = file.name.replace(/\.[^.]+$/, "")
  const nuevoNombre = `${baseName || "foto"}.${ext}`

  return new File([blob], nuevoNombre, { type: mimeType, lastModified: Date.now() })
}

async function loadBitmap(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  // createImageBitmap es mucho más rápido cuando está disponible
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file)
    } catch {
      // fallback a HTMLImageElement
    }
  }

  return await new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img as unknown as CanvasImageSource & { width: number; height: number })
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}
