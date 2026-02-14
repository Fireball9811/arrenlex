import { NextResponse } from "next/server"

const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dsaycjsoodznzkewbmun.supabase.co"

/**
 * GET /auth/abrir-enlace/ir?url=<gmail_wrapped_url>
 * Extrae la URL real de Supabase desde el enlace envuelto por Gmail (google.com/url?q=...)
 * y redirige solo si el destino es el verify de nuestro proyecto Supabase.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const encodedInput = requestUrl.searchParams.get("url")

  if (!encodedInput || encodedInput.length > 4000) {
    return NextResponse.redirect(new URL("/auth/abrir-enlace?error=1", request.url), 302)
  }

  try {
    const gmailUrl = decodeURIComponent(encodedInput)
    const parsed = new URL(gmailUrl)

    if (parsed.hostname !== "www.google.com" || !parsed.pathname.includes("/url")) {
      return NextResponse.redirect(new URL("/auth/abrir-enlace?error=1", request.url), 302)
    }

    const realEncoded = parsed.searchParams.get("q")
    if (!realEncoded) {
      return NextResponse.redirect(new URL("/auth/abrir-enlace?error=1", request.url), 302)
    }

    const realUrl = decodeURIComponent(realEncoded)
    const supabaseVerify = new URL(realUrl)

    const allowedOrigin = SUPABASE_ORIGIN.replace(/\/$/, "")
    const verifyPath = "/auth/v1/verify"

    if (supabaseVerify.origin !== allowedOrigin || !supabaseVerify.pathname.startsWith(verifyPath)) {
      return NextResponse.redirect(new URL("/auth/abrir-enlace?error=1", request.url), 302)
    }

    const res = NextResponse.redirect(realUrl, 302)
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return res
  } catch {
    return NextResponse.redirect(new URL("/auth/abrir-enlace?error=1", request.url), 302)
  }
}
