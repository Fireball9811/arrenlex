import { NextResponse } from "next/server"
import {
  findUserByEmail,
  generateResetToken,
  hashResetToken,
  getResetTokenExpiry,
  saveResetToken,
  sanitizeEmail,
} from "@/lib/auth/password-reset-service"
import { sendPasswordResetEmail } from "@/lib/email/send-reset"

const RESET_TOKEN_EXPIRY_MINUTES = 60

/**
 * POST /api/auth/request-password-reset
 * Recibe email. Si el usuario existe: genera token seguro, lo guarda hasheado, envía email.
 * Respuesta genérica en éxito y error para no revelar si el email existe.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawEmail = body?.email

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { error: "El correo electrónico es requerido" },
        { status: 400 }
      )
    }

    const email = sanitizeEmail(rawEmail)
    if (!email) {
      return NextResponse.json(
        { error: "El correo electrónico es requerido" },
        { status: 400 }
      )
    }

    // Validar formato básico de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de correo inválido" },
        { status: 400 }
      )
    }

    const user = await findUserByEmail(email)

    // No revelar si el email existe o no: misma respuesta genérica
    const successMessage = "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."

    if (!user) {
      return NextResponse.json({ message: successMessage }, { status: 200 })
    }

    const plainToken = generateResetToken()
    const hashedToken = hashResetToken(plainToken)
    const expiresAt = getResetTokenExpiry()

    await saveResetToken(user.id, hashedToken, expiresAt)

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
      /\/$/,
      ""
    )
    const resetPath = process.env.RESET_PASSWORD_PATH ?? "/reset-password"
    const resetLink = `${baseUrl}${resetPath.startsWith("/") ? resetPath : `/${resetPath}`}?token=${encodeURIComponent(plainToken)}`

    const sendResult = await sendPasswordResetEmail({
      to: user.email,
      resetLink,
      expiresMinutes: RESET_TOKEN_EXPIRY_MINUTES,
    })

    if (!sendResult.success) {
      console.error("[request-password-reset] Error enviando email:", sendResult.error)
      // No revelar fallo de envío al cliente; respuesta genérica
    }

    return NextResponse.json({ message: successMessage }, { status: 200 })
  } catch (err) {
    console.error("[request-password-reset]", err)
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}
