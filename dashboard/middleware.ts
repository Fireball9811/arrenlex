import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Rutas públicas — no requieren autenticación
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/forgot-password", // Versión en inglés de recuperar-contrasena
  "/reset-password",  // Versión en inglés de restablecer-contrasena
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
  "/api/propiedades/ciudades",
  "/api/propiedades/public",
  "/api/propiedades/banner",
  "/api/intake/aplicacion",
  "/api/intake/tokens/publico",
  "/api/solicitudes-visita",
  "/api/contacto",
]

const PUBLIC_PATH_PATTERNS = [
  /^\/api\/propiedades\/[^/]+\/public$/,
  /^\/api\/propiedades\/[^/]+\/aplicacion-info$/,
]

async function getSessionRole(request: NextRequest): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const response = NextResponse.next()
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    return perfil?.role ?? "inquilino"
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. Rutas públicas — pasar sin verificar
  const isPublic =
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/")) ||
    PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(path))

  if (isPublic) {
    return NextResponse.next()
  }

  // 2. Verificar sesión
  const role = await getSessionRole(request)

  if (!role) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(loginUrl, 302)
  }

  // 3. Rutas de admin — por defecto solo "admin"; Habeas Data también para "propietario"
  if (path.startsWith("/admin")) {
    const isHabeasData = path === "/admin/habeas-data" || path.startsWith("/admin/habeas-data/")
    if (isHabeasData) {
      if (role !== "admin" && role !== "propietario") {
        return NextResponse.redirect(new URL("/login?unauthorized=1", request.url), 302)
      }
    } else if (role !== "admin") {
      return NextResponse.redirect(new URL("/login?unauthorized=1", request.url), 302)
    }
  }

  // 4. Rutas de propietario — solo "propietario" o "admin"
  if (path.startsWith("/propietario")) {
    if (role !== "admin" && role !== "propietario") {
      return NextResponse.redirect(new URL("/login?unauthorized=1", request.url), 302)
    }
  }

  // 5. Rutas de inquilino — solo "inquilino", "admin" y roles especiales
  // (propietario NO accede a vistas privadas del inquilino)
  if (path.startsWith("/inquilino")) {
    const INQUILINO_ALLOWED_ROLES = ["inquilino", "admin", "maintenance_special", "insurance_special", "lawyer_special"]
    if (!INQUILINO_ALLOWED_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/propietario/dashboard", request.url), 302)
    }
  }

  // 6. Rutas de dashboard general — requieren autenticación (cualquier rol)
  if (path.startsWith("/dashboard")) {
    // Ya verificamos que role existe arriba, así que solo permitimos pasar
    // El dashboard interno maneja la redirección según rol
    if (!role) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", path)
      return NextResponse.redirect(loginUrl, 302)
    }
  }

  // 7. Rutas de imprimir recibos — requieren autenticación
  if (path.startsWith("/imprimir-recibo")) {
    if (!role) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", path)
      return NextResponse.redirect(loginUrl, 302)
    }
  }

  // 8. Rutas de mis contratos — requieren autenticación
  if (path.startsWith("/mis-contratos")) {
    if (!role) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", path)
      return NextResponse.redirect(loginUrl, 302)
    }
  }

  // 9. Ruta de test-username — solo admin (página de desarrollo)
  if (path.startsWith("/test-username")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/login?unauthorized=1", request.url), 302)
    }
  }

  // 10. Agregar headers de seguridad
  const response = NextResponse.next()

  // Headers de seguridad existentes
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Nuevos headers de seguridad
  // Content-Security-Policy - Previene XSS, clickjacking, y otros ataques de inyección
  // Nota: Para desarrollo con Next.js, necesitamos ser menos estrictos. Ajustar para producción.
  const isDev = process.env.NODE_ENV === "development"
  if (!isDev) {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline/eval para Next.js
        "style-src 'self' 'unsafe-inline'", // unsafe-inline para styled-components/emotion
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

  // Strict-Transport-Security - Fuerza HTTPS (solo en producción con HTTPS)
  if (process.env.VERCEL_ENV === "production" || !isDev) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
  }

  // Permissions-Policy - Controla qué APIs del navegador pueden usar
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

  // X-XSS-Protection - Protección adicional contra XSS (obsoleto pero útil para browsers viejos)
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // Cross-Origin-Opener-Policy - Previene ataques de window.opener
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")

  // Cross-Origin-Resource-Policy - Previene lectura de recursos cross-origin
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|Logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
