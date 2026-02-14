import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Listar contratos del usuario
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const estado = searchParams.get("estado")

  let query = supabase
    .from("contratos")
    .select(`
      *,
      propiedad:propiedades(
        id, direccion, ciudad, barrio, valor_arriendo
      ),
      arrendatario:arrendatarios(
        id, nombre, cedula, email, celular
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (estado) {
    query = query.eq("estado", estado)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST - Crear nuevo contrato
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()

  // Validar campos requeridos
  if (!body.propiedad_id || !body.arrendatario_id || !body.fecha_inicio || !body.ciudad_firma) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: propiedad_id, arrendatario_id, fecha_inicio, ciudad_firma" },
      { status: 400 }
    )
  }

  // Obtener valor de arriendo de la propiedad
  const { data: propiedad } = await supabase
    .from("propiedades")
    .select("valor_arriendo")
    .eq("id", body.propiedad_id)
    .eq("user_id", user.id)
    .single()

  if (!propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  // Crear el contrato
  const { data, error } = await supabase
    .from("contratos")
    .insert({
      user_id: user.id,
      propiedad_id: body.propiedad_id,
      arrendatario_id: body.arrendatario_id,
      fecha_inicio: body.fecha_inicio,
      duracion_meses: Number(body.duracion_meses) || 12,
      canon_mensual: Number(body.canon_mensual) || Number(propiedad.valor_arriendo) || 0,
      ciudad_firma: body.ciudad_firma,
      estado: body.estado || "borrador",
    })
    .select(`
      *,
      propiedad:propiedades(
        id, direccion, ciudad, barrio, valor_arriendo
      ),
      arrendatario:arrendatarios(
        id, nombre, cedula, email, celular
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
