import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { constantDelay } from "@/lib/auth/security"
import { rateLimitMiddleware, RateLimitPresets, getRateLimitHeaders } from "@/lib/rate-limit"
import { formatZodError, loginSchema } from "@/lib/validation/schemas"
import { secureLog } from "@/lib/logging/secure-logger"
import type { UserRole } from "@/lib/auth/role"

const VALID_ROLES: UserRole[] = ["admin", "propietario", "inquilino", "maintenance_special", "insurance_special", "lawyer_special"]

/**
 * POST /api/auth/login
 * Autenticación por email/username y contraseña contra Supabase Auth.
 * Acepta tanto email como username para iniciar sesión.
 *
 * Flujo:
 * 1. Recibe email o username + contraseña
 * 2. Si es username, busca el email correspondiente en perfiles
 * 3. Autentica con Supabase Auth usando el email
 * 4. Crea la sesión del usuario
 */
export async function POST(request: Request) {
  // Rate limiting: 5 intentos por 15 minutos
  const rateLimitResult = rateLimitMiddleware(request, RateLimitPresets.login)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Demasiados intentos de inicio de sesión. Por favor espera unos minutos antes de intentar nuevamente.",
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
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = formatZodError(validationResult.error)
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      )
    }

    const { email: rawEmailOrUsername, password } = validationResult.data

    const admin = createAdminClient()
    let emailToUse = rawEmailOrUsername.trim()
    let usedUsername = false

    // Verificar si es un username (no tiene @) o un email (tiene @)
    if (!emailToUse.includes("@")) {
      // Es un username, buscar el email correspondiente
      const { data: perfil } = await admin
        .from("perfiles")
        .select("email, username")
        .eq("username", emailToUse)
        .maybeSingle()

      if (!perfil || !perfil.email) {
        // Aplicar delay constante para prevenir timing attacks
        await constantDelay()
        return NextResponse.json(
          { error: "Usuario o contraseña incorrectos" },
          { status: 401 }
        )
      }

      emailToUse = perfil.email
      usedUsername = true
    } else {
      // Es un email, validar formato
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailToUse)) {
        return NextResponse.json(
          { error: "Formato de correo inválido" },
          { status: 400 }
        )
      }
      emailToUse = emailToUse.toLowerCase()
    }

    // Intentar iniciar sesión con Supabase Auth
    const supabase = await createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    })

    if (signInError || !data.user) {
      // Aplicar delay constante para prevenir timing attacks
      await constantDelay()
      secureLog.securityError("auth/login", signInError, { reason: "invalid_credentials" })
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      )
    }

    // Obtener el rol del usuario desde perfiles
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("role, username, email, nombre")
      .eq("id", data.user.id)
      .single()

    const role = VALID_ROLES.includes(perfil?.role as UserRole) ? (perfil?.role as UserRole) : "inquilino"

    // Loguear login exitoso sin datos sensibles
    secureLog.userAction("LOGIN_SUCCESS", data.user.id, { role })

    // Importante: La sesión ya está creada por signInWithPassword
    // Solo necesitamos retornar la información del usuario
    const metadata = data.user.user_metadata ?? {}

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: perfil?.email || data.user.email,
        username: perfil?.username,
        role,
        nombre: perfil?.nombre,
      },
      mustChangePassword: metadata.must_change_password === true,
      tempPasswordExpiresAt: metadata.temp_password_expires_at as number | undefined,
      usedUsername, // Indica si se usó username para el login
      redirect: role === "admin"
        ? "/admin/dashboard"
        : role === "propietario"
          ? "/propietario/dashboard"
          : "/inquilino/dashboard",
    })
  } catch (err) {
    // Aplicar delay constante también en errores
    await constantDelay()
    secureLog.securityError("auth/login", err, { reason: "unexpected_error" })
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    )
  }
}
