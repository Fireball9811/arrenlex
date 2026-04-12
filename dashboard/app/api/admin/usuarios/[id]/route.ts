import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminRole } from "@/lib/auth/role"
import { generateTempPassword } from "@/lib/auth/temp-password"
import { sendInvitationEmail } from "@/lib/email/send-invitation"

const VALID_ROLES = ["admin", "propietario", "inquilino", "maintenance_special", "insurance_special", "lawyer_special"] as const
const EXPIRY_DAYS = parseInt(process.env.INVITATION_TEMP_PASSWORD_EXPIRY_DAYS ?? "7", 10) || 7

// GET - Obtiene un usuario por ID (solo admin)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!(await isAdminRole(supabaseServer, user.id))) {
    return NextResponse.json({ error: "Solo administradores pueden ver usuarios" }, { status: 403 })
  }

  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("perfiles")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("[GET /api/admin/usuarios/[id]] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PATCH - Actualizar datos del perfil: nombre, celular, cédula, dirección, rol, activo, bloqueado; o acciones (bloquear/activar/etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!(await isAdminRole(supabaseServer, user.id))) {
    return NextResponse.json({ error: "Solo administradores pueden modificar usuarios" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const {
    accion,
    role: newRole,
    nombre,
    celular,
    cedula,
    cedula_lugar_expedicion,
    direccion,
    activo: bodyActivo,
    bloqueado: bodyBloqueado,
  } = body

  const hasDataFields =
    nombre !== undefined ||
    celular !== undefined ||
    cedula !== undefined ||
    cedula_lugar_expedicion !== undefined ||
    direccion !== undefined ||
    newRole !== undefined ||
    bodyActivo !== undefined ||
    bodyBloqueado !== undefined

  if (!accion && !hasDataFields) {
    return NextResponse.json({ error: "Indica accion o al menos un campo a actualizar" }, { status: 400 })
  }

  if (id === user?.id) {
    if (accion === "bloquear" || accion === "desactivar") {
      return NextResponse.json({ error: "No puedes desactivar o bloquear tu propio usuario" }, { status: 400 })
    }
    if (bodyBloqueado === true || bodyActivo === false) {
      return NextResponse.json({ error: "No puedes desactivar o bloquear tu propio usuario" }, { status: 400 })
    }
  }

  const admin = createAdminClient()

  const updates: Record<string, boolean | string | null> = {}

  if (newRole !== undefined) {
    if (!VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: "Rol no válido" }, { status: 400 })
    }
    updates.role = newRole
  }

  if (accion) {
    switch (accion) {
      case "bloquear":
        updates.bloqueado = true
        updates.activo = false
        break
      case "desbloquear":
        updates.bloqueado = false
        updates.activo = true
        break
      case "activar":
        updates.activo = true
        break
      case "desactivar":
        updates.activo = false
        break
      case "actualizar_datos_personales":
        // Los datos personales se manejan en los campos individuales fuera del switch
        break
      case "actualizar_datos_bancarios": {
        // Campos bancarios
        const {
          cuenta_bancaria_1_entidad,
          cuenta_bancaria_1_numero,
          cuenta_bancaria_1_tipo,
          cuenta_bancaria_2_entidad,
          cuenta_bancaria_2_numero,
          cuenta_bancaria_2_tipo,
          llave_bancaria_1,
          llave_bancaria_2,
        } = body

        console.log("[api/admin/usuarios/[id]] actualizar_datos_bancarios - Campos recibidos:", {
          cuenta_bancaria_1_entidad,
          cuenta_bancaria_1_numero,
          cuenta_bancaria_1_tipo,
          cuenta_bancaria_2_entidad,
          cuenta_bancaria_2_numero,
          cuenta_bancaria_2_tipo,
          llave_bancaria_1,
          llave_bancaria_2,
        })

        if (cuenta_bancaria_1_entidad !== undefined) updates.cuenta_bancaria_1_entidad = cuenta_bancaria_1_entidad
        if (cuenta_bancaria_1_numero !== undefined) updates.cuenta_bancaria_1_numero = cuenta_bancaria_1_numero
        if (cuenta_bancaria_1_tipo !== undefined) updates.cuenta_bancaria_1_tipo = cuenta_bancaria_1_tipo
        if (cuenta_bancaria_2_entidad !== undefined) updates.cuenta_bancaria_2_entidad = cuenta_bancaria_2_entidad
        if (cuenta_bancaria_2_numero !== undefined) updates.cuenta_bancaria_2_numero = cuenta_bancaria_2_numero
        if (cuenta_bancaria_2_tipo !== undefined) updates.cuenta_bancaria_2_tipo = cuenta_bancaria_2_tipo
        if (llave_bancaria_1 !== undefined) updates.llave_bancaria_1 = llave_bancaria_1
        if (llave_bancaria_2 !== undefined) updates.llave_bancaria_2 = llave_bancaria_2

        // Actualizar timestamp
        updates.actualizado_en = new Date().toISOString()

        console.log("[api/admin/usuarios/[id]] actualizar_datos_bancarios - Updates a aplicar:", updates)

        break
      }
      case "resetear_contrasena": {
        // Generar contraseña temporal y enviar email
        try {
          // Obtener datos del usuario para el email
          const { data: usuario } = await admin
            .from("perfiles")
            .select("id, email")
            .eq("id", id)
            .single()

          if (!usuario || !usuario.email) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
          }

          const tempPassword = generateTempPassword()
          const tempPasswordExpiresAt = Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000

          // Actualizar contraseña en Supabase Auth
          const { error: updateAuthError } = await admin.auth.admin.updateUserById(id, {
            password: tempPassword,
            user_metadata: {
              must_change_password: true,
              temp_password_expires_at: tempPasswordExpiresAt,
            },
          })

          if (updateAuthError) {
            console.error("[api/admin/usuarios/[id]] Error actualizando contraseña:", updateAuthError)
            return NextResponse.json(
              { error: "Error al actualizar la contraseña: " + updateAuthError.message },
              { status: 500 }
            )
          }

          // Enviar email con contraseña temporal
          const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL ??
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
          const loginUrl = `${siteUrl}/login`

          const emailResult = await sendInvitationEmail({
            to: usuario.email,
            tempPassword,
            loginUrl,
            expiresInDays: EXPIRY_DAYS,
          })

          if (!emailResult.success) {
            console.error("[api/admin/usuarios/[id]] Error enviando email:", emailResult.error)
            return NextResponse.json(
              {
                error: "Contraseña actualizada pero no se pudo enviar el email: " + emailResult.error,
                message: "Contraseña temporal: " + tempPassword,
              },
              { status: 200 }
            )
          }

          return NextResponse.json(
            {
              message: "Contraseña temporal enviada exitosamente a " + usuario.email,
              email: usuario.email,
            },
            { status: 200 }
          )
        } catch (err) {
          console.error("[api/admin/usuarios/[id]] Error en resetear_contrasena:", err)
          return NextResponse.json(
            { error: "Error al procesar: " + (err instanceof Error ? err.message : "desconocido") },
            { status: 500 }
          )
        }
      }
      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }
  }

  if (nombre !== undefined) updates.nombre = typeof nombre === "string" ? nombre.trim() || null : null
  if (celular !== undefined) updates.celular = typeof celular === "string" ? celular.trim() || null : null
  if (cedula !== undefined) updates.cedula = typeof cedula === "string" ? cedula.trim() || null : null
  if (cedula_lugar_expedicion !== undefined) {
    updates.cedula_lugar_expedicion =
      typeof cedula_lugar_expedicion === "string" ? cedula_lugar_expedicion.trim() || null : null
  }
  if (direccion !== undefined) updates.direccion = typeof direccion === "string" ? direccion.trim() || null : null
  if (bodyActivo !== undefined) updates.activo = Boolean(bodyActivo)
  if (bodyBloqueado !== undefined) updates.bloqueado = Boolean(bodyBloqueado)

  const { data, error } = await admin
    .from("perfiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PUT - Actualizar nombre y rol de un usuario (para el modal de edición)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!(await isAdminRole(supabaseServer, user.id))) {
    return NextResponse.json({ error: "Solo administradores pueden modificar usuarios" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { role, nombre } = body

  if (!role && !nombre) {
    return NextResponse.json({ error: "Debe proporcionar al menos un campo para actualizar" }, { status: 400 })
  }

  if (id === user?.id && role && role !== "admin") {
    // Permitir cambiar nombre a sí mismo, pero advertir sobre cambio de rol
    return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 })
  }

  const admin = createAdminClient()
  const updates: Record<string, string | null> = {}

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Rol no válido" }, { status: 400 })
    }
    updates.role = role
  }

  if (nombre !== undefined) {
    updates.nombre = typeof nombre === "string" ? nombre.trim() || null : null
  }

  const { data, error } = await admin
    .from("perfiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ mensaje: "Usuario actualizado correctamente", ...data })
}

// DELETE - Eliminar un usuario (solo si no tiene propiedades asignadas)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!(await isAdminRole(supabaseServer, user.id))) {
    return NextResponse.json({ error: "Solo administradores pueden eliminar usuarios" }, { status: 403 })
  }

  const { id } = await params
  const currentUserId = user?.id
  const admin = createAdminClient()

  console.log("[DELETE /api/admin/usuarios/[id]] Iniciando eliminación:", { id, currentUserId, email: user?.email })

  try {
    // Verificar si hay arrendatarios asociados a este user_id
    const { data: arrendatarios, error: arrendatariosError } = await admin
      .from("arrendatarios")
      .select("id, nombre")
      .eq("user_id", id)

    if (arrendatariosError) {
      console.error("[DELETE /api/admin/usuarios/[id]] Error verificando arrendatarios:", arrendatariosError)
    }

    const arrendatariosCount = arrendatarios?.length ?? 0
    console.log("[DELETE /api/admin/usuarios/[id]] Arrendatarios encontrados:", arrendatariosCount)

    // CASO 1: Es tu propio usuario y tiene arrendatarios
    // Solo eliminar arrendatarios, mantener el usuario admin
    if (id === currentUserId && arrendatariosCount > 0) {
      console.log("[DELETE /api/admin/usuarios/[id]] CASO: Propio usuario con arrendatarios - Solo eliminar arrendatarios")

      const { error: deleteArrendatariosError } = await admin
        .from("arrendatarios")
        .delete()
        .eq("user_id", id)

      if (deleteArrendatariosError) {
        console.error("[DELETE /api/admin/usuarios/[id]] Error eliminando arrendatarios:", deleteArrendatariosError)
        return NextResponse.json({ error: deleteArrendatariosError.message }, { status: 500 })
      }

      return NextResponse.json({
        message: "Arrendatario eliminado. Tu cuenta de administrador se mantiene activa.",
        arrendatariosEliminados: arrendatariosCount,
      })
    }

    // CASO 2: Es tu propio usuario SIN arrendatarios
    // No permitir eliminarlo por seguridad
    if (id === currentUserId) {
      console.log("[DELETE /api/admin/usuarios/[id]] CASO: Propio usuario sin arrendatarios - Bloqueado")
      return NextResponse.json({
        error: "No puedes eliminar tu propio usuario de administrador. Usa otra cuenta de admin o contacta al soporte técnico."
      }, { status: 400 })
    }

    // CASO 3: Es otro usuario - verificar propiedades primero
    const { count: propiedadesCount } = await admin
      .from("propiedades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id)

    if ((propiedadesCount ?? 0) > 0) {
      return NextResponse.json(
        { error: `El usuario tiene ${propiedadesCount} propiedad(es) asignada(s). No se puede eliminar.` },
        { status: 400 }
      )
    }

    // Eliminar el usuario completo
    console.log("[DELETE /api/admin/usuarios/[id]] CASO: Otro usuario - Eliminando todo")

    // Eliminar arrendatarios asociados si existen
    await admin
      .from("arrendatarios")
      .delete()
      .eq("user_id", id)

    // Eliminar el perfil de la tabla perfiles
    const { error: deleteProfileError } = await admin
      .from("perfiles")
      .delete()
      .eq("id", id)

    if (deleteProfileError) {
      return NextResponse.json({ error: deleteProfileError.message }, { status: 500 })
    }

    // Eliminar el usuario de Supabase Auth
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(id)

    if (deleteAuthError) {
      console.warn("[DELETE /api/admin/usuarios/[id]] Error eliminando usuario de auth:", deleteAuthError)
      // No frenamos el proceso si falla auth, ya que el perfil está eliminado
    }

    return NextResponse.json({
      message: "Usuario eliminado exitosamente",
      id,
    })
  } catch (err) {
    console.error("[DELETE /api/admin/usuarios/[id]] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar usuario" },
      { status: 500 }
    )
  }
}
