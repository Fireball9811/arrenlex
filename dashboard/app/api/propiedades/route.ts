import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ciudad = searchParams.get("ciudad")

  let query = supabase
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

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from("propiedades")
    .insert({
      user_id: user.id,
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
