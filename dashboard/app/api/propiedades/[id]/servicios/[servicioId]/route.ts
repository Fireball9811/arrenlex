import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

interface RouteContext {
  params: Promise<{ id: string; servicioId: string }>
}

// PUT - Actualizar un servicio
export async function PUT(request: Request, { params }: RouteContext) {
  const { id, servicioId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Verificar que la propiedad pertenece al usuario
  let propiedadQueryPut = admin.from("propiedades").select("id").eq("id", id)
  if (role === "propietario") {
    propiedadQueryPut = propiedadQueryPut.eq("user_id", user.id)
  }
  const { data: propiedad } = await propiedadQueryPut.single()
  if (!propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  const body = await request.json()

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre del servicio es requerido" }, { status: 400 })
  }

  const { data, error } = await admin
    .from("propiedades_servicios")
    .update({
      nombre: body.nombre.trim(),
      referencia: body.referencia?.trim() || null,
      pagina_web: body.pagina_web?.trim() || null,
      telefono: body.telefono?.trim() || null,
      pago_promedio: body.pago_promedio ? Number(body.pago_promedio) : 0,
      estrato: body.estrato ? Number(body.estrato) : null,
      fecha_vencimiento: body.fecha_vencimiento || null,
    })
    .eq("id", servicioId)
    .eq("propiedad_id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

// DELETE - Eliminar un servicio
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, servicioId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Verificar que la propiedad pertenece al usuario
  let propiedadQueryDel = admin.from("propiedades").select("id").eq("id", id)
  if (role === "propietario") {
    propiedadQueryDel = propiedadQueryDel.eq("user_id", user.id)
  }
  const { data: propiedad } = await propiedadQueryDel.single()
  if (!propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  const { error } = await admin
    .from("propiedades_servicios")
    .delete()
    .eq("id", servicioId)
    .eq("propiedad_id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
