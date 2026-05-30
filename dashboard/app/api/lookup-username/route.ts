import { NextResponse } from "next/server"

/**
 * POST /api/lookup-username
 * Deshabilitado por seguridad: exponía emails asociados a usernames.
 * El login resuelve el username en el servidor vía POST /api/auth/login.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Este endpoint ya no está disponible. Usa el inicio de sesión normal." },
    { status: 410 }
  )
}
