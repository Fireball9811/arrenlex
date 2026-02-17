import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Lista propiedades.
 * Admin: todas (con opcional filtro ciudad, user_id); incluye datos del propietario.
 * Propietario: solo las suyas (user_id = user.id).
 * Inquilino: 403.
 */
export async function GET(request: Request) {
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
      { error: "Solo administradores o propietarios pueden listar propiedades" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const ciudad = searchParams.get("ciudad")
  const userIdFilter = searchParams.get("user_id")

  const admin = createAdminClient()

  if (role === "admin") {
    let query = admin
      .from("propiedades")
      .select("*")
      .order("created_at", { ascending: false })

    if (ciudad) {
      query = query.eq("ciudad", ciudad)
    }
    if (userIdFilter) {
      query = query.eq("user_id", userIdFilter)
    }

    const { data: propiedades, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = propiedades ?? []
    if (list.length === 0) {
      return NextResponse.json([])
    }

    const userIds = [...new Set(list.map((p: { user_id: string }) => p.user_id))]
    const { data: perfiles } = await admin
      .from("perfiles")
      .select("id, nombre, email")
      .in("id", userIds)

    const perfilesMap = new Map(
      (perfiles ?? []).map((p: { id: string; nombre: string | null; email: string }) => [
        p.id,
        { id: p.id, nombre: p.nombre ?? null, email: p.email },
      ])
    )

    const withPropietario = list.map((p: Record<string, unknown>) => ({
      ...p,
      propietario: perfilesMap.get(p.user_id as string) ?? null,
    }))

    return NextResponse.json(withPropietario)
  }

  // Propietario: solo sus propiedades
  let query = admin
    .from("propiedades")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (ciudad) {
    query = query.eq("ciudad", ciudad)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

/**
 * POST - Crea una propiedad.
 * Admin: puede enviar body.user_id (propietario); si no, usa user.id.
 * Propietario: user_id siempre user.id (ignora body.user_id).
 * Inquilino: 403.
 */
export async function POST(request: Request) {
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
      { error: "Solo administradores o propietarios pueden crear propiedades" },
      { status: 403 }
    )
  }

  const body = await request.json()

  let ownerId: string
  if (role === "admin" && body.user_id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(body.user_id)) {
      return NextResponse.json({ error: "user_id inválido" }, { status: 400 })
    }
    ownerId = body.user_id
  } else {
    ownerId = user.id
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("propiedades")
    .insert({
      user_id: ownerId,
      direccion: body.direccion ?? "",
      ciudad: body.ciudad ?? "",
      barrio: body.barrio ?? "",
      tipo: body.tipo ?? "apartamento",
      habitaciones: Number(body.habitaciones) || 0,
      banos: Number(body.banos) || 0,
      area: Number(body.area) || 0,
      valor_arriendo: Number(body.valorArriendo) || 0,
      descripcion: body.descripcion ?? "",
      estado: body.estado ?? "disponible",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
