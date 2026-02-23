import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdmin } from "@/lib/supabase/admin"

const VALID_ROLES = ["admin", "propietario", "inquilino", "maintenance_special", "insurance_special", "lawyer_special"] as const

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

  if (!isAdmin(user.email)) {
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

  if (!isAdmin(user.email)) {
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
