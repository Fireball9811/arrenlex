import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/** PostgREST puede devolver FK como objeto o como array de un elemento */
function unwrapPropiedad<T extends { user_id?: string }>(
  row: T | T[] | null | undefined
): T | null {
  if (row == null) return null
  return Array.isArray(row) ? row[0] ?? null : row
}

/**
 * GET /api/recibos-pago/[id]
 * Obtiene un recibo específico
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log("🔵 [GET /api/recibos-pago/[id]] Buscando recibo:", id)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  console.log("✓ Rol del usuario:", role, "User ID:", user.id)

  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Obtener el recibo con todos los datos necesarios
  const { data: recibo, error: fetchError } = await admin
    .from("recibos_pago")
    .select(`
      *,
      propiedad:propiedades(id, direccion, ciudad, barrio, numero_matricula, user_id)
    `)
    .eq("id", id)
    .single()

  console.log("📊 Recibo encontrado:", !!recibo, "Error:", fetchError?.message)

  if (fetchError || !recibo) {
    console.log("❌ Error o recibo no encontrado")
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }

  // Si es propietario, verificar que la propiedad pertenezca al usuario
  if (role === "propietario") {
    const propiedad = unwrapPropiedad(recibo.propiedad as { user_id?: string } | { user_id?: string }[] | null)
    console.log("🔒 Verificando propiedad:", {
      propiedadUserId: propiedad?.user_id,
      userId: user.id,
      coincide: propiedad?.user_id === user.id,
    })

    if (!propiedad || propiedad.user_id !== user.id) {
      console.log("❌ Sin permiso")
      return NextResponse.json({ error: "No tienes permiso para ver este recibo" }, { status: 403 })
    }
  }

  console.log("✅ Recibo enviado exitosamente")
  return NextResponse.json(recibo)
}

/**
 * PATCH /api/recibos-pago/[id]
 * Actualiza parcialmente un recibo
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  // Construir objeto de actualización solo con campos proporcionados
  const updateData: Record<string, any> = {}
  const allowedFields = [
    "propiedad_id",
    "arrendador_nombre",
    "arrendador_cedula",
    "propietario_nombre",
    "propietario_cedula",
    "valor_arriendo",
    "valor_arriendo_letras",
    "fecha_inicio_periodo",
    "fecha_fin_periodo",
    "tipo_pago",
    "fecha_recibo",
    "numero_recibo",
    "cuenta_consignacion",
    "referencia_pago",
    "nota",
    "estado",
  ]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  // Si es propietario: la propiedad del recibo (actual o nueva si cambia) debe ser suya
  if (role === "propietario") {
    const { data: existing } = await admin
      .from("recibos_pago")
      .select("propiedad_id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
    }

    const targetPropiedadId =
      updateData.propiedad_id !== undefined ? updateData.propiedad_id : existing.propiedad_id

    const { data: propRow } = await admin
      .from("propiedades")
      .select("user_id")
      .eq("id", targetPropiedadId)
      .single()

    if (!propRow || propRow.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para editar este recibo" }, { status: 403 })
    }
  }

  let query = admin
    .from("recibos_pago")
    .update(updateData)
    .eq("id", id)

  const { data, error } = await query.select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/recibos-pago/[id]
 * Actualiza un recibo (completo)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  // Si es propietario: propiedad resultante debe ser suya (PUT puede omitir propiedad_id → se conserva la actual)
  if (role === "propietario") {
    const { data: existing } = await admin
      .from("recibos_pago")
      .select("propiedad_id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
    }

    const targetPropiedadId =
      body.propiedad_id !== undefined && body.propiedad_id !== null && body.propiedad_id !== ""
        ? body.propiedad_id
        : existing.propiedad_id

    const { data: propRow } = await admin
      .from("propiedades")
      .select("user_id")
      .eq("id", targetPropiedadId)
      .single()

    if (!propRow || propRow.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para editar este recibo" }, { status: 403 })
    }
  }

  let query = admin
    .from("recibos_pago")
    .update({
      arrendador_nombre: body.arrendador_nombre,
      arrendador_cedula: body.arrendador_cedula,
      propietario_nombre: body.propietario_nombre,
      propietario_cedula: body.propietario_cedula,
      valor_arriendo: body.valor_arriendo,
      valor_arriendo_letras: body.valor_arriendo_letras,
      fecha_inicio_periodo: body.fecha_inicio_periodo,
      fecha_fin_periodo: body.fecha_fin_periodo,
      tipo_pago: body.tipo_pago,
      fecha_recibo: body.fecha_recibo,
      numero_recibo: body.numero_recibo,
      cuenta_consignacion: body.cuenta_consignacion,
      referencia_pago: body.referencia_pago,
      nota: body.nota,
      estado: body.estado,
    })
    .eq("id", id)

  const { data, error } = await query.select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/recibos-pago/[id]
 * Elimina un recibo
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Si es propietario, verificar que el recibo pertenezca a una propiedad suya
  if (role === "propietario") {
    const { data: existing } = await admin
      .from("recibos_pago")
      .select("propiedad_id")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
    }

    const { data: propRow } = await admin
      .from("propiedades")
      .select("user_id")
      .eq("id", existing.propiedad_id)
      .single()

    if (!propRow || propRow.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar este recibo" }, { status: 403 })
    }
  }

  let query = admin.from("recibos_pago").delete().eq("id", id)

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
