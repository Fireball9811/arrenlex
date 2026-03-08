import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Listado público de URLs de imágenes para el banner de la landing.
 * Sin autenticación. No expone datos sensibles (solo url_publica).
 * Retorna un array de strings mezclado aleatoriamente.
 */
export async function GET() {
  const admin = createAdminClient()

  const { data: imagenes, error } = await admin
    .from("propiedades_imagenes")
    .select("url_publica")
    .order("created_at", { ascending: false })
    .limit(40)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const urls = (imagenes ?? [])
    .map((img) => img.url_publica)
    .filter((url): url is string => typeof url === "string" && url.length > 0)

  // Mezcla aleatoria (Fisher-Yates) para variedad en cada visita
  for (let i = urls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[urls[i], urls[j]] = [urls[j], urls[i]]
  }

  return NextResponse.json(urls)
}
