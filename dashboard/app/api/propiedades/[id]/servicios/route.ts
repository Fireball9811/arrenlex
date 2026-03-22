import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Listar servicios de una propiedad
export async function GET(_request: Request, { params }: RouteContext) {
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
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Verificar que la propiedad existe y pertenece al usuario (si es propietario)
  let propiedadQuery = admin.from("propiedades").select("id").eq("id", id)
  if (role === "propietario") {
    propiedadQuery = propiedadQuery.eq("user_id", user.id)
  }
  const { data: propiedad } = await propiedadQuery.single()
  if (!propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  const { data, error } = await admin
    .from("propiedades_servicios")
    .select("*")
    .eq("propiedad_id", id)
    .order("nombre", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST - Crear un servicio para una propiedad
export async function POST(request: Request, { params }: RouteContext) {
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
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Verificar que la propiedad pertenece al usuario
  let propiedadQueryPost = admin.from("propiedades").select("id").eq("id", id)
  if (role === "propietario") {
    propiedadQueryPost = propiedadQueryPost.eq("user_id", user.id)
  }
  const { data: propiedad } = await propiedadQueryPost.single()
  if (!propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  const body = await request.json()

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre del servicio es requerido" }, { status: 400 })
  }

  const { data, error } = await admin
    .from("propiedades_servicios")
    .insert({
      propiedad_id: id,
      nombre: body.nombre.trim(),
      referencia: body.referencia?.trim() || null,
      pagina_web: body.pagina_web?.trim() || null,
      telefono: body.telefono?.trim() || null,
      pago_promedio: body.pago_promedio ? Number(body.pago_promedio) : 0,
      estrato: body.estrato ? Number(body.estrato) : null,
      fecha_vencimiento: body.fecha_vencimiento || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
