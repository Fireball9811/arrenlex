import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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
  try {
    const body = await request.json()
    const rawEmailOrUsername = body?.email // El campo se llama "email" pero puede ser username
    const password = body?.password

    console.log("[auth/login] Intento de login con:", {
      input: rawEmailOrUsername,
      hasPassword: !!password,
    })

    if (!rawEmailOrUsername || typeof rawEmailOrUsername !== "string") {
      return NextResponse.json(
        { error: "Correo electrónico o nombre de usuario es requerido" },
        { status: 400 }
      )
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Contraseña es requerida" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    let emailToUse = rawEmailOrUsername.trim()
    let usedUsername = false

    // Verificar si es un username (no tiene @) o un email (tiene @)
    if (!emailToUse.includes("@")) {
      console.log("[auth/login] Detectado username, buscando email...")
      // Es un username, buscar el email correspondiente
      const { data: perfil, error: perfilError } = await admin
        .from("perfiles")
        .select("email, username")
        .eq("username", emailToUse)
        .maybeSingle()

      console.log("[auth/login] Resultado búsqueda username:", {
        found: !!perfil,
        email: perfil?.email,
        username: perfil?.username,
        error: perfilError?.message,
      })

      if (!perfil || !perfil.email) {
        return NextResponse.json(
          { error: "Usuario o contraseña incorrectos" },
          { status: 401 }
        )
      }

      emailToUse = perfil.email
      usedUsername = true
      console.log("[auth/login] Email encontrado:", emailToUse)
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

    console.log("[auth/login] Intentando autenticar con email:", emailToUse)

    // Intentar iniciar sesión con Supabase Auth
    const supabase = await createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    })

    console.log("[auth/login] Resultado autenticación:", {
      success: !!data.user,
      error: signInError?.message,
    })

    if (signInError || !data.user) {
      console.error("[auth/login] Error de autenticación:", signInError)
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

    console.log("[auth/login] Login exitoso para:", {
      id: data.user.id,
      email: perfil?.email,
      username: perfil?.username,
      role,
    })

    // Importante: La sesión ya está creada por signInWithPassword
    // Solo necesitamos retornar la información del usuario
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: perfil?.email || data.user.email,
        username: perfil?.username,
        role,
        nombre: perfil?.nombre,
      },
      usedUsername, // Indica si se usó username para el login
      redirect: role === "admin"
        ? "/admin/dashboard"
        : role === "propietario"
          ? "/propietario/dashboard"
          : "/inquilino/dashboard",
    })
  } catch (err) {
    console.error("[auth/login] Error:", err)
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    )
  }
}
