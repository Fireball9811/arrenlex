import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Rutas públicas — no requieren autenticación
const PUBLIC_PATHS = [
  "/",
  "/login",
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
  "/api/propiedades/ciudades",
  "/api/propiedades/public",
  "/api/propiedades/banner",
  "/api/intake/aplicacion",
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

  // 3. Rutas de admin — solo rol "admin"
  if (path.startsWith("/admin")) {
    if (role !== "admin") {
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

  // 6. Agregar headers de seguridad
  const response = NextResponse.next()
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|Logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
