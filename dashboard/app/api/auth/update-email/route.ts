import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/auth/update-email
 * Permite a un usuario cambiar su email con validación de unicidad global.
 *
 * Flujo:
 * 1. Verifica que el usuario esté autenticado
 * 2. Valida que el nuevo email no exista en perfiles ni en auth.users
 * 3. Actualiza el email en Supabase Auth (envía email de verificación)
 * 4. Actualiza el email en la tabla perfiles
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Debes iniciar sesión." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const newEmail = body?.newEmail

    if (!newEmail || typeof newEmail !== "string") {
      return NextResponse.json(
        { error: "El nuevo email es requerido." },
        { status: 400 }
      )
    }

    // Sanitizar email
    const normalizedEmail = newEmail.trim().toLowerCase()

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "El formato del email no es válido." },
        { status: 400 }
      )
    }

    // No permitir cambiar al mismo email
    if (normalizedEmail === user.email) {
      return NextResponse.json(
        { error: "El nuevo email debe ser diferente al actual." },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. Verificar que el nuevo email NO exista en la tabla perfiles
    const { data: existingPerfil } = await admin
      .from("perfiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (existingPerfil) {
      return NextResponse.json(
        {
          error: "Este email ya está en uso.",
          details: "El correo electrónico pertenece a otro usuario. Debes elegir uno diferente."
        },
        { status: 409 }
      )
    }

    // 2. Verificar que el email NO exista en auth.users (usando admin client)
    // Supabase ya tiene unicidad en auth.users.email, pero verificamos antes
    // para dar un mensaje claro
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers()

    if (!listError && existingUsers.users) {
      const emailExists = existingUsers.users.some(
        u => u.email?.toLowerCase() === normalizedEmail && u.id !== user.id
      )

      if (emailExists) {
        return NextResponse.json(
          {
            error: "Este email ya está en uso.",
            details: "El correo electrónico pertenece a otro usuario. Debes elegir uno diferente."
          },
          { status: 409 }
        )
      }
    }

    // 3. Actualizar email en Supabase Auth
    // Esto envía automáticamente un email de verificación al nuevo email
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { email: normalizedEmail }
    )

    if (updateError) {
      console.error("[update-email] Error actualizando en auth.users:", updateError)
      return NextResponse.json(
        { error: "Error al actualizar el email en el sistema de autenticación." },
        { status: 500 }
      )
    }

    // 4. Actualizar email en la tabla perfiles
    const { error: perfilError } = await admin
      .from("perfiles")
      .update({ email: normalizedEmail })
      .eq("id", user.id)

    if (perfilError) {
      console.error("[update-email] Error actualizando en perfiles:", perfilError)
      // Intentar rollback en auth.users (revertir al email anterior)
      await admin.auth.admin.updateUserById(user.id, { email: user.email! })
      return NextResponse.json(
        { error: "Error al actualizar el email en tu perfil." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Email actualizado correctamente.",
      newEmail: normalizedEmail,
      verificationRequired: true,
      details: "Se ha enviado un email de verificación a tu nuevo correo electrónico. Debes hacer clic en el enlace para confirmar el cambio."
    })

  } catch (err) {
    console.error("[update-email]", err)
    return NextResponse.json(
      { error: "Error al procesar la solicitud." },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/update-email
 * Verifica si un email está disponible (no existe en la base de datos).
 * Útil para validación en tiempo real en el frontend.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email es requerido." },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Validar formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Formato de email inválido." },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Verificar en perfiles
    const { data: existingPerfil } = await admin
      .from("perfiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (existingPerfil) {
      return NextResponse.json({
        available: false,
        message: "Este email ya está en uso."
      })
    }

    // Verificar en auth.users
    const { data: existingUsers } = await admin.auth.admin.listUsers()

    if (existingUsers.users) {
      const emailExists = existingUsers.users.some(
        u => u.email?.toLowerCase() === normalizedEmail
      )

      if (emailExists) {
        return NextResponse.json({
          available: false,
          message: "Este email ya está en uso."
        })
      }
    }

    return NextResponse.json({
      available: true,
      message: "Email disponible."
    })

  } catch (err) {
    console.error("[update-email] GET", err)
    return NextResponse.json(
      { error: "Error al verificar disponibilidad del email." },
      { status: 500 }
    )
  }
}
