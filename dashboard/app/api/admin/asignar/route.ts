import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/supabase/admin"

interface AsignacionRequest {
  tipo: "mantenimiento" | "seguro" | "legal"
  caso_id: string
  assigned_to: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  try {
    const body = await request.json() as AsignacionRequest
    const { tipo, caso_id, assigned_to } = body

    // Validar datos
    if (!tipo || !caso_id || !assigned_to) {
      return NextResponse.json(
        { error: "Faltan datos requeridos: tipo, caso_id, assigned_to" },
        { status: 400 }
      )
    }

    if (!["mantenimiento", "seguro", "legal"].includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo debe ser: mantenimiento, seguro o legal" },
        { status: 400 }
      )
    }

    // Determinar tabla según tipo
    const tableName = tipo === "mantenimiento"
      ? "solicitudes_mantenimiento"
      : tipo === "seguro"
      ? "casos_seguros"
      : "casos_legales"

    // Verificar que el caso existe
    const { data: casoExists } = await supabase
      .from(tableName)
      .select("id")
      .eq("id", caso_id)
      .maybeSingle()

    if (!casoExists) {
      return NextResponse.json(
        { error: `Caso de ${tipo} no encontrado` },
        { status: 404 }
      )
    }

    // Verificar que el usuario asignado existe
    const { data: userExists } = await supabase
      .from("perfiles")
      .select("id, role")
      .eq("id", assigned_to)
      .maybeSingle()

    if (!userExists) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Validar que el rol del usuario corresponda al tipo de caso
    const expectedRole = tipo === "mantenimiento"
      ? "maintenance_special"
      : tipo === "seguro"
      ? "insurance_special"
      : "lawyer_special"

    if (userExists.role !== expectedRole) {
      return NextResponse.json(
        { error: `El usuario debe tener rol ${expectedRole} para casos de ${tipo}` },
        { status: 400 }
      )
    }

    // Actualizar asignación
    const { data, error } = await supabase
      .from(tableName)
      .update({ assigned_to })
      .eq("id", caso_id)
      .select()
      .single()

    if (error) {
      console.error("[admin asignar POST]", error)
      return NextResponse.json(
        { error: "Error al asignar caso" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Caso de ${tipo} asignado correctamente`,
      data
    })

  } catch (error) {
    console.error("[admin asignar POST]", error)
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}

// GET: Listar usuarios especiales disponibles para asignación
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { data: usuarios } = await supabase
    .from("perfiles")
    .select("id, email, nombre, role")
    .in("role", ["maintenance_special", "insurance_special", "lawyer_special"])
    .eq("activo", true)
    .order("nombre", { ascending: true })

  return NextResponse.json(usuarios ?? [])
}
