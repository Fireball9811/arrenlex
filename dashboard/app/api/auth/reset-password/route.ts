import { NextResponse } from "next/server"
import {
  findUserByResetToken,
  hashResetToken,
  updatePasswordAndClearToken,
  hashPassword,
  isPasswordValid,
} from "@/lib/auth/password-reset-service"

/**
 * POST /api/auth/reset-password
 * Recibe token (texto plano del link) + newPassword.
 * Hashea el token, busca usuario con token válido y no expirado, actualiza contraseña y limpia token.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawToken = body?.token
    const newPassword = body?.newPassword

    if (!rawToken || typeof rawToken !== "string") {
      return NextResponse.json(
        { error: "Enlace inválido o expirado. Solicita uno nuevo." },
        { status: 400 }
      )
    }

    const token = String(rawToken).trim()
    if (!token) {
      return NextResponse.json(
        { error: "Enlace inválido o expirado. Solicita uno nuevo." },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "La nueva contraseña es requerida." },
        { status: 400 }
      )
    }

    if (!isPasswordValid(newPassword)) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      )
    }

    const hashedToken = hashResetToken(token)
    const user = await findUserByResetToken(hashedToken)

    // Respuesta genérica si token inválido o expirado (no revelar detalles)
    const invalidMessage = "El enlace es inválido o ha expirado. Solicita uno nuevo."

    if (!user) {
      return NextResponse.json({ error: invalidMessage }, { status: 400 })
    }

    const newPasswordHash = await hashPassword(newPassword)
    await updatePasswordAndClearToken(user.id, newPasswordHash)

    return NextResponse.json(
      { message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión." },
      { status: 200 }
    )
  } catch (err) {
    console.error("[reset-password]", err)
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}
