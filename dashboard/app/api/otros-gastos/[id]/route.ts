import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Obtiene un gasto específico por ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params
  const admin = createAdminClient()

  let query = admin
    .from("otros_gastos")
    .select(
      `
      id,
      propiedad_id,
      user_id,
      nombre_completo,
      cedula,
      tarjeta_profesional,
      correo_electronico,
      motivo_pago,
      descripcion_trabajo,
      fecha_realizacion,
      valor,
      banco,
      referencia_pago,
      numero_recibo,
      fecha_emision,
      estado,
      created_at,
      updated_at,
      propiedades ( id, direccion, ciudad, barrio, titulo ),
      users ( email, nombre )
      `
    )
    .eq("id", id)

  if (role === "propietario") {
    query = query.eq("user_id", user.id)
  }

  const { data, error } = await query.single()

  if (error) {
    console.error("[otros-gastos GET by id]", error)
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PATCH - Actualiza un gasto existente
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "propietario" && role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar que el gasto existe y el usuario tiene acceso
  const { data: existing, error: errExists } = await admin
    .from("otros_gastos")
    .select("id, user_id, estado")
    .eq("id", id)
    .single()

  if (errExists || !existing) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  if (role === "propietario" && existing.user_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // Preparar actualización
  const updateData: Record<string, unknown> = {}
  const allowedFields = [
    "nombre_completo",
    "cedula",
    "tarjeta_profesional",
    "correo_electronico",
    "motivo_pago",
    "descripcion_trabajo",
    "fecha_realizacion",
    "valor",
    "banco",
    "referencia_pago",
    "estado",
  ]

  const bodyRecord = body as Record<string, unknown>

  for (const field of allowedFields) {
    if (field in bodyRecord) {
      const value = bodyRecord[field]
      if (value === null || value === "") {
        updateData[field] = null
      } else if (typeof value === "string") {
        updateData[field] = value.trim()
      } else {
        updateData[field] = value
      }
    }
  }

  // Validar valor si se está actualizando
  if ("valor" in updateData && typeof updateData.valor === "number" && updateData.valor <= 0) {
    return NextResponse.json({ error: "El valor debe ser mayor a cero" }, { status: 400 })
  }

  const { data: updated, error: errUpdate } = await admin
    .from("otros_gastos")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (errUpdate) {
    console.error("[otros-gastos PATCH]", errUpdate)
    return NextResponse.json({ error: "Error al actualizar el gasto" }, { status: 500 })
  }

  return NextResponse.json(updated)
}

/**
 * DELETE - Elimina un gasto (solo si está en estado pendiente)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "propietario" && role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params
  const admin = createAdminClient()

  // Verificar que el gasto existe y el usuario tiene acceso
  const { data: existing, error: errExists } = await admin
    .from("otros_gastos")
    .select("id, user_id, estado")
    .eq("id", id)
    .single()

  if (errExists || !existing) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  if (role === "propietario" && existing.user_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // Solo permitir eliminar si está pendiente
  if (existing.estado !== "pendiente") {
    return NextResponse.json(
      { error: "Solo se pueden eliminar gastos en estado pendiente" },
      { status: 400 }
    )
  }

  const { error: errDelete } = await admin
    .from("otros_gastos")
    .delete()
    .eq("id", id)

  if (errDelete) {
    console.error("[otros-gastos DELETE]", errDelete)
    return NextResponse.json({ error: "Error al eliminar el gasto" }, { status: 500 })
  }

  return NextResponse.json({ message: "Gasto eliminado correctamente" })
}
