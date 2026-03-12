import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/recibos-pago
 * Obtiene los recibos de pago del propietario
 * Admin: puede ver todos los recibos
 * Propietario: solo sus propios recibos
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
      { error: "No tienes permiso para ver recibos" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const propiedadId = searchParams.get("propiedad_id")

  const admin = createAdminClient()

  let query = admin
    .from("recibos_pago")
    .select(`
      *,
      propiedad:propiedades(id, direccion, ciudad, barrio)
    `)
    .order("fecha_recibo", { ascending: false })

  if (role === "propietario") {
    query = query.eq("user_id", user.id)
  }

  if (propiedadId) {
    query = query.eq("propiedad_id", propiedadId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching recibos:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

/**
 * POST /api/recibos-pago
 * Crea un nuevo recibo de pago
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
      { error: "No tienes permiso para crear recibos" },
      { status: 403 }
    )
  }

  const body = await request.json()

  const admin = createAdminClient()

  // Verificar que la propiedad pertenece al usuario
  if (role === "propietario") {
    const { data: propiedad, error: propError } = await admin
      .from("propiedades")
      .select("id")
      .eq("id", body.propiedad_id)
      .eq("user_id", user.id)
      .single()

    if (propError || !propiedad) {
      return NextResponse.json(
        { error: "No tienes permiso para crear recibos para esta propiedad" },
        { status: 403 }
      )
    }
  }

  // NO enviar numero_recibo - se autogenera en la base de datos
  const { data, error } = await admin
    .from("recibos_pago")
    .insert({
      propiedad_id: body.propiedad_id,
      user_id: user.id,
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
      // numero_recibo se autogenera
      cuenta_consignacion: body.cuenta_consignacion,
      referencia_pago: body.referencia_pago,
      nota: body.nota,
      estado: "borrador",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating recibo:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
