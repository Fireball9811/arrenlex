import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Obtiene una propiedad por id.
 * Admin: puede ver cualquier propiedad.
 * Propietario: solo si user_id = user.id.
 * Inquilino: 403.
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
    return NextResponse.json(
      { error: "Solo administradores o propietarios pueden ver propiedades" },
      { status: 403 }
    )
  }

  const admin = createAdminClient()

  if (role === "admin") {
    const { data, error } = await admin
      .from("propiedades")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
    }
    return NextResponse.json(data)
  }

  const { data, error } = await admin
    .from("propiedades")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PUT - Actualiza una propiedad.
 * Admin: puede actualizar cualquier propiedad y cambiar body.user_id (propietario).
 * Propietario: solo si user_id = user.id; no puede cambiar user_id.
 * Inquilino: 403.
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
    return NextResponse.json(
      { error: "Solo administradores o propietarios pueden editar propiedades" },
      { status: 403 }
    )
  }

  const body = await request.json()

  const admin = createAdminClient()

  const updatePayload: Record<string, unknown> = {
    direccion: body.direccion,
    ciudad: body.ciudad,
    barrio: body.barrio,
    tipo: body.tipo,
    habitaciones: Number(body.habitaciones) || 0,
    banos: Number(body.banos) || 0,
    area: Number(body.area) || 0,
    valor_arriendo: (Number(body.valorArriendo) ?? Number(body.valor_arriendo)) || 0,
    descripcion: body.descripcion,
    estado: body.estado,
    matricula_inmobiliaria: body.matricula_inmobiliaria ?? null,
    cuenta_bancaria_entidad: body.cuentaBancariaEntidad ?? body.cuenta_bancaria_entidad ?? null,
    cuenta_bancaria_tipo: body.cuentaBancariaTipo ?? body.cuenta_bancaria_tipo ?? null,
    cuenta_bancaria_numero: body.cuentaBancariaNumero ?? body.cuenta_bancaria_numero ?? null,
    cuenta_bancaria_titular: body.cuentaBancariaTitular ?? body.cuenta_bancaria_titular ?? null,
  }

  if (role === "admin" && body.user_id != null) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(body.user_id)) {
      updatePayload.user_id = body.user_id
    }
  }

  if (role === "admin") {
    const { data, error } = await admin
      .from("propiedades")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
    }
    return NextResponse.json(data)
  }

  // Propietario: solo puede editar sus propiedades; no se incluye user_id
  const { data, error } = await admin
    .from("propiedades")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }
  return NextResponse.json(data)
}

/**
 * DELETE - Elimina una propiedad.
 * Admin: puede eliminar cualquier propiedad.
 * Propietario: solo si user_id = user.id.
 * Inquilino: 403.
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
    return NextResponse.json(
      { error: "Solo administradores o propietarios pueden eliminar propiedades" },
      { status: 403 }
    )
  }

  const admin = createAdminClient()

  let query = admin.from("propiedades").delete().eq("id", id)
  if (role === "propietario") {
    query = query.eq("user_id", user.id)
  }

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
