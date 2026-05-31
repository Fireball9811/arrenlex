import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Rutas públicas — no requieren autenticación
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
  "/auth/callback",
  "/auth/complete-session",
  "/auth/abrir-enlace",
  "/auth/abrir-enlace/ir",
  "/cambio-contrasena",
  "/registrar-inquilino",
  "/catalogo",
  "/politica-datos",
  "/politica-tratamiento-datos",
  "/api/auth/login",
  "/api/auth/request-password-reset",
  "/api/auth/reset-password",
  "/api/propiedades/ciudades",
  "/api/propiedades/public",
  "/api/propiedades/banner",
  "/api/intake/aplicacion",
  "/api/intake/tokens/publico",
  "/api/solicitudes-visita",
  "/api/contacto",
  "/api/intake/google-forms",
]

const PUBLIC_PATH_PATTERNS = [
  /^\/api\/propiedades\/[^/]+\/public$/,
  /^\/api\/propiedades\/[^/]+\/aplicacion-info$/,
]

const VALID_ROLES = new Set([
  "admin",
  "propietario",
  "inquilino",
  "maintenance_special",
  "insurance_special",
  "lawyer_special",
])

function isPublicPath(path: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/")) ||
    PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(path))
  )
}

async function resolveRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string> {
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  if (perfil?.role && VALID_ROLES.has(perfil.role)) {
    return perfil.role
  }

  const { count } = await supabase
    .from("propiedades")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (count && count > 0) return "propietario"

  return "inquilino"
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  const isDev = process.env.NODE_ENV === "development"
  if (!isDev) {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co https://api.resend.com",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ")
    )
  }

  if (process.env.VERCEL_ENV === "production" || !isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }

  response.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
    ].join(", ")
  )

  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")

  return response
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isPublicPath(path)) {
    return applySecurityHeaders(supabaseResponse)
  }

  if (!user) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(loginUrl, 302)
  }

  let role = "inquilino"
  try {
    role = await resolveRole(supabase, user.id)
  } catch {
    role = "inquilino"
  }

  if (path.startsWith("/admin")) {
    const isHabeasData =
      path === "/admin/habeas-data" || path.startsWith("/admin/habeas-data/")
    if (isHabeasData) {
      if (role !== "admin" && role !== "propietario") {
        return NextResponse.redirect(new URL("/login?unauthorized=1", request.url), 302)
      }
    } else if (role !== "admin") {
      return NextResponse.redirect(new URL("/login?unauthorized=1", request.url), 302)
    }
  }

  if (path.startsWith("/propietario")) {
    if (role !== "admin" && role !== "propietario") {
      return NextResponse.redirect(new URL("/login?unauthorized=1", request.url), 302)
    }
  }

  if (path.startsWith("/inquilino")) {
    const INQUILINO_ALLOWED_ROLES = [
      "inquilino",
      "admin",
      "maintenance_special",
      "insurance_special",
      "lawyer_special",
    ]
    if (!INQUILINO_ALLOWED_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/propietario/dashboard", request.url), 302)
    }
  }

  if (path.startsWith("/test-username") && role !== "admin") {
    return NextResponse.redirect(new URL("/login?unauthorized=1", request.url), 302)
  }

  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|Logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
