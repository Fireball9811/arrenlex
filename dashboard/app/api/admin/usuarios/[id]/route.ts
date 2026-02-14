import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createAdminClient, isAdmin } from "@/lib/supabase/admin"

// PATCH - Actualizar estado de usuario (bloquear/desbloquear, activar/desactivar)
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
  const { accion } = body // accion: "bloquear" | "desbloquear" | "activar" | "desactivar"

  if (!accion) {
    return NextResponse.json({ error: "Acción no especificada" }, { status: 400 })
  }

  const admin = createAdminClient()

  // No permitir bloquear/desactivar a uno mismo
  if (id === user.id) {
    return NextResponse.json({ error: "No puedes modificar tu propio usuario" }, { status: 400 })
  }

  let updates: Record<string, boolean> = {}
  let mensaje = ""

  switch (accion) {
    case "bloquear":
      updates = { bloqueado: true, activo: false }
      mensaje = "Usuario bloqueado correctamente"
      break
    case "desbloquear":
      updates = { bloqueado: false, activo: true }
      mensaje = "Usuario desbloqueado correctamente"
      break
    case "activar":
      // Solo activar si no está bloqueado
      updates = { activo: true }
      mensaje = "Usuario activado correctamente"
      break
    case "desactivar":
      // Solo desactivar si no está bloqueado
      updates = { activo: false }
      mensaje = "Usuario desactivado correctamente"
      break
    default:
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  }

  // Actualizar el perfil
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

  // Si se bloquea, también desactivar en auth
  if (accion === "bloquear") {
    try {
      await admin.auth.admin.updateUserById(id, { banned: true })
    } catch (e) {
      console.error("Error al bloquear en auth:", e)
    }
  } else if (accion === "desbloquear") {
    try {
      await admin.auth.admin.updateUserById(id, { banned: false })
    } catch (e) {
      console.error("Error al desbloquear en auth:", e)
    }
  }

  return NextResponse.json({ ...data, mensaje })
}
