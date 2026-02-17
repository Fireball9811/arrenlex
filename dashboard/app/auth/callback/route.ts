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

  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "app/auth/callback/route.ts:GET",
      message: "callback GET received",
      data: { hasCode: !!code, hasError: !!errorParam, origin },
      timestamp: Date.now(),
      hypothesisId: "H1-H4",
    }),
  }).catch(() => {})
  // #endregion

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=auth`, 302)
  }

  if (!code) {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "app/auth/callback/route.ts:no_code",
        message: "return HTML to preserve hash then go to complete-session",
        data: {},
        timestamp: Date.now(),
        hypothesisId: "H4",
      }),
    }).catch(() => {})
    // #endregion
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Completando...</title></head><body><script>window.location.replace("/auth/complete-session" + (window.location.hash || ""));</script><p>Completando sesión...</p></body></html>`
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    })
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "app/auth/callback/route.ts:after_exchange",
        message: "after exchangeCodeForSession",
        data: { exchangeError: error?.message ?? null },
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {})
    // #endregion

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message)
      return NextResponse.redirect(`${origin}/login?error=auth`, 302)
    }

    // Obtener el rol del usuario y redirigir a su dashboard específico
    const { data: { user } } = await supabase.auth.getUser()
    let successRedirect = `${origin}/cambio-contrasena` // fallback

    if (user) {
      try {
        const role = await getUserRole(supabase, user)
        const dashboardPath = getDashboardPathByRole(role)
        successRedirect = nextPath && nextPath.startsWith("/")
          ? `${origin}${nextPath}`
          : `${origin}${dashboardPath}`
      } catch (err) {
        console.error("[auth/callback] error getting role:", err)
        // Si falla, usar el fallback
      }
    }

    const res = NextResponse.redirect(successRedirect, 302)
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return res
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "app/auth/callback/route.ts:catch",
        message: "callback catch",
        data: { err: String(err) },
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {})
    // #endregion
    console.error("[auth/callback] unexpected error:", err)
    return NextResponse.redirect(`${origin}/login?error=auth`, 302)
  }
}
