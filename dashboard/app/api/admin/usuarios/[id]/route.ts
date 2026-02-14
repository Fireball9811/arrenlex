import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdmin } from "@/lib/supabase/admin"

const VALID_ROLES = ["admin", "propietario", "inquilino"] as const

// PATCH - Actualizar estado (bloquear/activar) y/o rol de usuario
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
  const { accion, role: newRole } = body

  if (!accion && newRole === undefined) {
    return NextResponse.json({ error: "Indica accion o role" }, { status: 400 })
  }

  if (id === user?.id && (accion === "bloquear" || accion === "desactivar")) {
    return NextResponse.json({ error: "No puedes desactivar o bloquear tu propio usuario" }, { status: 400 })
  }

  const admin = createAdminClient()

  const updates: Record<string, boolean | string> = {}

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
      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }
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

  return NextResponse.json(data)
}
