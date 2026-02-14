import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createAdminClient, isAdmin } from "@/lib/supabase/admin"

// PATCH - Actualizar estado de usuario (blocked/desblocked, active/desactive)
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
  const { accion } = body

  if (!accion) {
    return NextResponse.json({ error: "Acción no especificada" }, { status: 400 })
  }

  // No permitir bloquear/desbloquear a uno mismo
  if (id === user?.id) {
    return NextResponse.json({ error: "No puedes modificar tu propio usuario" }, { status: 400 })
  }

  const admin = createAdminClient()

  let updates: Record<string, boolean> = {}
  let mensaje = ""

  switch (accion) {
    case "bloquear":
      updates = { blocked: true, active: false }
      mensaje = "Usuario bloqueado correctamente"
      break
    case "desbloquear":
      updates = { blocked: false, active: true }
      mensaje = "Usuario desbloqueado correctamente"
      break
    case "activar":
      updates = { active: true }
      mensaje = "Usuario activado correctamente"
      break
    case "desactivar":
      updates = { active: false }
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

  // Nota: El bloqueo se maneja a nivel de aplicación con la tabla perfiles
  // No es necesario bloquear a nivel de auth since tenemos el control en la app

  return NextResponse.json({ ...data, mensaje })
}
