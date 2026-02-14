import { NextResponse } from "next/server"
import { findUserByEmail, comparePassword, sanitizeEmail } from "@/lib/auth/password-reset-service"
import { createSessionToken, setSessionCookie } from "@/lib/auth/session-sql"
import type { UserRole } from "@/lib/auth/role"

const VALID_ROLES: UserRole[] = ["admin", "propietario", "inquilino"]

/**
 * POST /api/auth/login
 * Autenticación por email y contraseña contra SQL Server.
 * Compara contraseña con bcrypt.compare. Si es válida, crea sesión (cookie JWT).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawEmail = body?.email
    const password = body?.password

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { error: "Correo electrónico es requerido" },
        { status: 400 }
      )
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Contraseña es requerida" },
        { status: 400 }
      )
    }

    const email = sanitizeEmail(rawEmail)
    if (!email) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      )
    }

    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      )
    }

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      )
    }

    const role = VALID_ROLES.includes(user.role as UserRole) ? (user.role as UserRole) : "inquilino"

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role,
    })
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role },
    })
  } catch (err) {
    console.error("[auth/login]", err)
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    )
  }
}
