import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = [
  "/login",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
  "/auth/callback",
  "/auth/complete-session",
  "/auth/abrir-enlace",
  "/auth/abrir-enlace/ir",
  "/cambio-contrasena",
  "/registrar-inquilino",
]

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))

  if (isPublic) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
