import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { fetchOtrosGastoCompleto } from "@/lib/otros-gastos/fetch-completo"

/**
 * GET - Obtiene un gasto específico por ID
 */
export async function GET(
  _request: Request,
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

  const completo = await fetchOtrosGastoCompleto(admin, id)
  if (!completo) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  if (role === "propietario" && completo.user_id !== user.id) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  return NextResponse.json(completo)
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

  if ("valor" in updateData && typeof updateData.valor === "number" && updateData.valor <= 0) {
    return NextResponse.json({ error: "El valor debe ser mayor a cero" }, { status: 400 })
  }

  if (Object.keys(updateData).length === 0) {
    const completoVacio = await fetchOtrosGastoCompleto(admin, id)
    if (!completoVacio) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
    }
    return NextResponse.json(completoVacio)
  }

  const { error: errUpdate } = await admin.from("otros_gastos").update(updateData).eq("id", id)

  if (errUpdate) {
    console.error("[otros-gastos PATCH]", errUpdate)
    return NextResponse.json({ error: "Error al actualizar el gasto" }, { status: 500 })
  }

  const completo = await fetchOtrosGastoCompleto(admin, id)
  if (!completo) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  return NextResponse.json(completo)
}

/**
 * DELETE - Elimina un gasto (solo si está en estado pendiente)
 */
export async function DELETE(
  _request: Request,
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

  if (existing.estado !== "pendiente") {
    return NextResponse.json(
      { error: "Solo se pueden eliminar gastos en estado pendiente" },
      { status: 400 }
    )
  }

  const { error: errDelete } = await admin.from("otros_gastos").delete().eq("id", id)

  if (errDelete) {
    console.error("[otros-gastos DELETE]", errDelete)
    return NextResponse.json({ error: "Error al eliminar el gasto" }, { status: 500 })
  }

  return NextResponse.json({ message: "Gasto eliminado correctamente" })
}
