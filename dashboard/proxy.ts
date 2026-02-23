import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Rutas que NO requieren autenticación (públicas)
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
  "/catalogo", // Catálogo público
]

// Rutas que solo admin puede acceder
const ADMIN_ONLY_PATHS = [
  "/admin",
]

// Rutas que solo propietarios pueden acceder (admin también tiene acceso)
const PROPIETARIO_ONLY_PATHS = [
  "/propietario",
]

async function getUserRole(request: NextRequest): Promise<{ role: string; userId: string } | null> {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // No-op en middleware
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Obtener el rol desde la base de datos
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = perfil?.role || "inquilino"

    return { role, userId: user.id }
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. Verificar si es una ruta pública
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))

  if (isPublic) {
    return NextResponse.next()
  }

  // 2. Para rutas protegidas, verificar la sesión usando Supabase
  const userData = await getUserRole(request)

  if (!userData) {
    // No hay sesión válida → redirigir a login
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(loginUrl, 302)
  }

  // 3. Verificación de rol para rutas específicas
  const userRole = userData.role

  // Rutas de admin - solo rol "admin"
  if (ADMIN_ONLY_PATHS.some((p) => path.startsWith(p))) {
    if (userRole !== "admin") {
      return NextResponse.redirect(new URL("/login?unauthorized", request.url), 302)
    }
  }

  // Rutas de propietario - solo rol "propietario" o "admin"
  if (PROPIETARIO_ONLY_PATHS.some((p) => path.startsWith(p))) {
    if (userRole !== "admin" && userRole !== "propietario") {
      return NextResponse.redirect(new URL("/login?unauthorized", request.url), 302)
    }
  }

  // 4. Sesión válida y rol correcto → continuar
  // Agregar headers de seguridad
  const response = NextResponse.next()

  // Headers de seguridad adicionales
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
