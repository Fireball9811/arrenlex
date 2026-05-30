import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/role"
import { getDashboardPathByRole } from "@/lib/auth/redirect-by-role"

/**
 * Callback de Supabase (magic link / PKCE).
 * - redirect_to debe coincidir con Supabase → Redirect URLs (ej. http://localhost:3000/auth/callback).
 * Supabase → Authentication → URL Configuration:
 * - Site URL: según entorno (ej. http://localhost:3000 en desarrollo).
 * - Redirect URLs: incluir /auth/callback, /cambio-contrasena y la raíz.
 * Sin code: devuelve HTML que preserva el hash y redirige en cliente a /auth/complete-session.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const errorParam = requestUrl.searchParams.get("error")
  const nextPath = requestUrl.searchParams.get("next")
  const origin = requestUrl.origin

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=auth`, 302)
  }

  if (!code) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Completando...</title></head><body><script>window.location.replace("/auth/complete-session" + (window.location.hash || ""));</script><p>Completando sesión...</p></body></html>`
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    })
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message)
      return NextResponse.redirect(`${origin}/login?error=auth`, 302)
    }

    const { data: { user } } = await supabase.auth.getUser()
    let successRedirect = `${origin}/cambio-contrasena`

    if (user) {
      try {
        const role = await getUserRole(supabase, user)
        const dashboardPath = getDashboardPathByRole(role)
        successRedirect = nextPath && nextPath.startsWith("/")
          ? `${origin}${nextPath}`
          : `${origin}${dashboardPath}`
      } catch (err) {
        console.error("[auth/callback] error getting role:", err)
      }
    }

    const res = NextResponse.redirect(successRedirect, 302)
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return res
  } catch (err) {
    console.error("[auth/callback] unexpected error:", err)
    return NextResponse.redirect(`${origin}/login?error=auth`, 302)
  }
}
