import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/auth/update-password
 * Permite a un usuario cambiar su contraseña verificando la actual primero.
 *
 * Flujo:
 * 1. Verifica que el usuario esté autenticado
 * 2. Verifica la contraseña actual usando Supabase Auth
 * 3. Valida la nueva contraseña (mínimo 8 caracteres)
 * 4. Actualiza la contraseña en Supabase Auth
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
    const currentPassword = body?.currentPassword
    const newPassword = body?.newPassword

    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json(
        { error: "La contraseña actual es requerida." },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "La nueva contraseña es requerida." },
        { status: 400 }
      )
    }

    // Validar longitud mínima de la nueva contraseña
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      )
    }

    // No permitir usar la misma contraseña
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "La nueva contraseña debe ser diferente a la actual." },
        { status: 400 }
      )
    }

    // Verificar la contraseña actual
    // Usamos signInWithPassword para verificar la contraseña actual
    const admin = createAdminClient()

    // Primero obtenemos el email del usuario
    const { data: currentUser } = await admin.auth.admin.getUserById(user.id)

    if (!currentUser.user?.email) {
      return NextResponse.json(
        { error: "No se pudo obtener la información del usuario." },
        { status: 500 }
      )
    }

    // Verificar contraseña actual intentando iniciar sesión
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.user.email,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta." },
        { status: 401 }
      )
    }

    // Actualizar la contraseña
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error("[update-password] Error actualizando contraseña:", updateError)
      return NextResponse.json(
        { error: "Error al actualizar la contraseña." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada correctamente.",
      details: "Tu contraseña ha sido cambiada exitosamente."
    })

  } catch (err) {
    console.error("[update-password]", err)
    return NextResponse.json(
      { error: "Error al procesar la solicitud." },
      { status: 500 }
    )
  }
}
