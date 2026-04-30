import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/auth/update-username
 * Permite a un usuario cambiar su nombre de usuario (username).
 * El username debe ser único en toda la base de datos.
 *
 * Flujo:
 * 1. Verifica que el usuario esté autenticado
 * 2. Valida que el nuevo username no exista en perfiles
 * 3. Actualiza el username en la tabla perfiles
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    console.log("[update-username] Usuario autenticado:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userError: userError?.message,
    })

    if (!user || userError) {
      console.error("[update-username] Error de autenticación:", userError)
      return NextResponse.json(
        { error: "No autorizado. Debes iniciar sesión." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const newUsername = body?.newUsername

    console.log("[update-username] Username recibido:", {
      newUsername,
      type: typeof newUsername,
    })

    if (!newUsername || typeof newUsername !== "string") {
      return NextResponse.json(
        { error: "El nombre de usuario es requerido." },
        { status: 400 }
      )
    }

    // Sanitizar username
    const normalizedUsername = newUsername.trim()

    // Validar longitud (mínimo 3, máximo 30 caracteres)
    if (normalizedUsername.length < 3) {
      return NextResponse.json(
        { error: "El nombre de usuario debe tener al menos 3 caracteres." },
        { status: 400 }
      )
    }

    if (normalizedUsername.length > 30) {
      return NextResponse.json(
        { error: "El nombre de usuario no puede tener más de 30 caracteres." },
        { status: 400 }
      )
    }

    // Validar formato: solo letras, números, guiones y guiones bajos
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(normalizedUsername)) {
      return NextResponse.json(
        {
          error: "El nombre de usuario solo puede contener letras, números, guiones (-) y guiones bajos (_)."
        },
        { status: 400 }
      )
    }

    // No permitir cambiar al mismo username
    const admin = createAdminClient()
    const { data: currentPerfil } = await admin
      .from("perfiles")
      .select("username")
      .eq("id", user.id)
      .single()

    if (currentPerfil?.username === normalizedUsername) {
      return NextResponse.json(
        { error: "El nuevo nombre de usuario debe ser diferente al actual." },
        { status: 400 }
      )
    }

    // Verificar que el nuevo username NO exista en la tabla perfiles
    const { data: existingPerfil } = await admin
      .from("perfiles")
      .select("id, username")
      .eq("username", normalizedUsername)
      .maybeSingle()

    if (existingPerfil) {
      return NextResponse.json(
        {
          error: "Este nombre de usuario ya está en uso.",
          details: "El nombre de usuario pertenece a otra persona. Debes elegir uno diferente."
        },
        { status: 409 }
      )
    }

    // Actualizar username en la tabla perfiles
    console.log("[update-username] Actualizando username:", {
      userId: user.id,
      oldUsername: currentPerfil?.username,
      newUsername: normalizedUsername,
    })

    const { error: updateError } = await admin
      .from("perfiles")
      .update({ username: normalizedUsername })
      .eq("id", user.id)

    if (updateError) {
      console.error("[update-username] Error actualizando:", updateError)
      return NextResponse.json(
        { error: "Error al actualizar el nombre de usuario." },
        { status: 500 }
      )
    }

    console.log("[update-username] Username actualizado exitosamente")

    // Verificar que se guardó correctamente
    const { data: verifyPerfil } = await admin
      .from("perfiles")
      .select("username")
      .eq("id", user.id)
      .single()

    console.log("[update-username] Verificación:", {
      expected: normalizedUsername,
      actual: verifyPerfil?.username,
      matches: verifyPerfil?.username === normalizedUsername,
    })

    return NextResponse.json({
      success: true,
      message: "Nombre de usuario actualizado correctamente.",
      username: normalizedUsername,
      verified: verifyPerfil?.username === normalizedUsername,
    })

  } catch (err) {
    console.error("[update-username]", err)
    return NextResponse.json(
      { error: "Error al procesar la solicitud." },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/update-username
 * Verifica si un username está disponible (no existe en la base de datos).
 * Útil para validación en tiempo real en el frontend.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Nombre de usuario es requerido." },
        { status: 400 }
      )
    }

    const normalizedUsername = username.trim()

    // Validar formato
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(normalizedUsername)) {
      return NextResponse.json(
        {
          available: false,
          message: "El nombre de usuario solo puede contener letras, números, guiones (-) y guiones bajos (_)."
        },
        { status: 400 }
      )
    }

    // Validar longitud
    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      return NextResponse.json(
        {
          available: false,
          message: "El nombre de usuario debe tener entre 3 y 30 caracteres."
        },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Verificar en perfiles
    const { data: existingPerfil } = await admin
      .from("perfiles")
      .select("id")
      .eq("username", normalizedUsername)
      .maybeSingle()

    if (existingPerfil) {
      return NextResponse.json({
        available: false,
        message: "Este nombre de usuario ya está en uso."
      })
    }

    return NextResponse.json({
      available: true,
      message: "Nombre de usuario disponible."
    })

  } catch (err) {
    console.error("[update-username] GET", err)
    return NextResponse.json(
      { error: "Error al verificar disponibilidad del nombre de usuario." },
      { status: 500 }
    )
  }
}
