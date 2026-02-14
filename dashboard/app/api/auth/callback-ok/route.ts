import { NextResponse } from "next/server"

/**
 * GET /api/auth/callback-ok
 * Diagnóstico: confirma que el servidor está activo y que la URL de callback es la correcta.
 * Si esta ruta responde 200, el servidor está bien. El redirect_to de Supabase debe ser exactamente:
 * http://localhost:3000/auth/callback (sin barra final, sin https).
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const callbackUrl = `${siteUrl.replace(/\/$/, "")}/auth/callback`
  return NextResponse.json({
    ok: true,
    message: "Servidor activo. Antes de abrir el magic link, verifica que el servidor esté en marcha.",
    redirect_to_exact: callbackUrl,
    hint: "En Supabase → Authentication → URL Configuration, Redirect URLs debe incluir exactamente la URL anterior.",
  })
}
