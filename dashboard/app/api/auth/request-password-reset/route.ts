import { NextResponse } from "next/server"
import {
  findUserByEmail,
  generateResetToken,
  hashResetToken,
  getResetTokenExpiry,
  saveResetToken,
} from "@/lib/auth/password-reset-service"
import { sendPasswordResetEmail } from "@/lib/email/send-reset"
import { rateLimitMiddleware, RateLimitPresets, getRateLimitHeaders } from "@/lib/rate-limit"
import { formatZodError, passwordResetRequestSchema } from "@/lib/validation/schemas"
import { secureLog } from "@/lib/logging/secure-logger"

const RESET_TOKEN_EXPIRY_MINUTES = 60

/**
 * POST /api/auth/request-password-reset
 * Recibe email. Si el usuario existe: genera token seguro, lo guarda hasheado, envía email.
 * Respuesta genérica en éxito y error para no revelar si el email existe.
 */
export async function POST(request: Request) {
  // Rate limiting: 3 solicitudes por hora
  const rateLimitResult = rateLimitMiddleware(request, RateLimitPresets.passwordReset)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Demasiadas solicitudes de restablecimiento. Por favor espera antes de intentar nuevamente.",
      },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    )
  }

  try {
    const body = await request.json()

    // Validar con Zod
    const validationResult = passwordResetRequestSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = formatZodError(validationResult.error)
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      )
    }

    const { email } = validationResult.data
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
      secureLog.error("request-password-reset", sendResult.error)
      // No revelar fallo de envío al cliente; respuesta genérica
    }

    return NextResponse.json({ message: successMessage }, { status: 200 })
  } catch (err) {
    secureLog.error("request-password-reset", err)
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}
