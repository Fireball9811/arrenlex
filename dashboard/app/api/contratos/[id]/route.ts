import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Obtener un contrato específico con todos sus datos
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params

  const { data, error } = await supabase
    .from("contratos")
    .select(`
      *,
      propiedad:propiedades(*),
      arrendatario:arrendatarios(*)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PATCH - Actualizar un contrato
export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json()

  const { data, error } = await supabase
    .from("contratos")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
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

  if (!data) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

// DELETE - Eliminar un contrato
export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params

  const { error } = await supabase
    .from("contratos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
