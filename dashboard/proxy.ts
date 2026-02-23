import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionFromCookie } from "@/lib/auth/session-sql"

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

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. Verificar si es una ruta pública
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))

  if (isPublic) {
    return NextResponse.next()
  }

  // 2. Para rutas protegidas, verificar la sesión JWT
  const session = await getSessionFromCookie()

  if (!session) {
    // No hay sesión válida → redirigir a login
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(loginUrl, 302)
  }

  // 3. Verificación de rol para rutas específicas
  const userRole = session.role as string

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
