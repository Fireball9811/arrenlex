import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "propiedades"
const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i

/**
 * Lista recursivamente archivos de imagen en una ruta del bucket.
 * Estructura: user_id/propiedad_id/categoria/archivo.jpg
 * Solo incluye imágenes de la carpeta "principal" (Foto Principal).
 */
async function listImagesRecursive(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  urls: string[],
  depth: number = 0
): Promise<void> {
  const { data: items, error } = await admin.storage.from(BUCKET).list(path, { limit: 500 })
  if (error) return

  for (const item of items ?? []) {
    const fullPath = path ? `${path}/${item.name}` : item.name

    if (IMAGE_EXT.test(item.name)) {
      // Es un archivo de imagen — solo incluir si estamos en carpeta "principal"
      if (path.endsWith("/principal") || path === "principal") {
        const { data } = admin.storage.from(BUCKET).getPublicUrl(fullPath)
        urls.push(data.publicUrl)
      }
    } else {
      // Es una carpeta: si estamos en nivel de categoria (depth=2), solo entrar a "principal"
      if (depth === 2 && item.name !== "principal") continue
      await listImagesRecursive(admin, fullPath, urls, depth + 1)
    }
  }
}

/**
 * Fisher-Yates shuffle
 */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Obtiene URLs desde propiedades_imagenes como fallback.
 */
async function getUrlsFromTable(
  admin: ReturnType<typeof createAdminClient>
): Promise<string[]> {
  const { data } = await admin
    .from("propiedades_imagenes")
    .select("url_publica")
    .eq("categoria", "principal")
    .order("created_at", { ascending: false })
    .limit(80)
  return (data ?? [])
    .map((r) => r.url_publica)
    .filter((u): u is string => typeof u === "string" && u.length > 0)
}

/**
 * GET - Listado público de URLs de imágenes para el banner de la landing.
 * Usa propiedades_imagenes (fotos subidas por propietarios).
 * Si está vacío, intenta listar desde Storage bucket "propiedades".
 * Retorna un array mezclado aleatoriamente (máx 80).
 */
export async function GET() {
  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    console.error("[banner] createAdminClient failed:", e)
    throw e
  }

  let source = await getUrlsFromTable(admin)
  if (source.length === 0) {
    const urls: string[] = []
    await listImagesRecursive(admin, "", urls)
    source = urls
  }

  const shuffled = shuffle(source).slice(0, 80)
  return NextResponse.json(shuffled)
}
