import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/recibos-pago/[id]
 * Obtiene un recibo específico
 */
export async function GET(
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

  let query = admin
    .from("recibos_pago")
    .select(`
      *,
      propiedad:propiedades(id, direccion, ciudad, barrio)
    `)
    .eq("id", id)

  if (role === "propietario") {
    query = query.eq("user_id", user.id)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/recibos-pago/[id]
 * Actualiza un recibo
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

  if (role === "propietario") {
    query = query.eq("user_id", user.id)
  }

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

  let query = admin.from("recibos_pago").delete().eq("id", id)

  if (role === "propietario") {
    query = query.eq("user_id", user.id)
  }

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
