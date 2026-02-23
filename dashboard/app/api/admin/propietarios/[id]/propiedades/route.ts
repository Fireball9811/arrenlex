import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdmin } from "@/lib/supabase/admin"

/**
 * API para gestionar las propiedades asignadas a un propietario
 * Endpoint: /api/admin/propietarios/{id}/propiedades
 */

// GET - Obtener propiedades de un propietario
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Solo administradores pueden ver propiedades" }, { status: 403 })
  }

  const { id } = await params
  const admin = createAdminClient()

  try {
    const { data: propiedades, error } = await admin
      .from("propiedades")
      .select("*")
      .eq("user_id", id)

    if (error) {
      console.error("[api/admin/propietarios/[id]/propiedades GET]", error)
      return NextResponse.json({ error: "Error al obtener propiedades" }, { status: 500 })
    }

    return NextResponse.json(propiedades ?? [])
  } catch (error) {
    console.error("[api/admin/propietarios/[id]/propiedades GET]", error)
    return NextResponse.json({ error: "Error al obtener propiedades" }, { status: 500 })
  }
}

// POST - Asignar una propiedad a un propietario
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Solo administradores pueden asignar propiedades" }, { status: 403 })
  }

  const { id: propietarioId } = await params
  const body = await request.json()
  const { propiedadId } = body

  if (!propiedadId) {
    return NextResponse.json({ error: "Se requiere propiedadId" }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    // Verificar que la propiedad existe
    const { data: propiedad, error: errProp } = await admin
      .from("propiedades")
      .select("id, user_id, direccion, ciudad")
      .eq("id", propiedadId)
      .single()

    if (errProp || !propiedad) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
    }

    // Si la propiedad ya tiene un propietario diferente, se permitirá el cambio
    // El frontend ya muestra la confirmación al usuario
    const propietarioAnteriorId = propiedad.user_id

    // Verificar que el propietario existe
    const { data: propietario, error: errPropietario } = await admin
      .from("perfiles")
      .select("id, nombre, role")
      .eq("id", propietarioId)
      .single()

    if (errPropietario || !propietario) {
      return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 })
    }

    if (propietario.role !== "propietario") {
      return NextResponse.json({ error: "El usuario no tiene rol de propietario" }, { status: 400 })
    }

    // Actualizar el propietario de la propiedad
    const { error } = await admin
      .from("propiedades")
      .update({ user_id: propietarioId })
      .eq("id", propiedadId)

    if (error) {
      console.error("[api/admin/propietarios/[id]/propiedades POST]", error)
      return NextResponse.json({ error: "Error al asignar propiedad" }, { status: 500 })
    }

    const mensajeCambio = propietarioAnteriorId && propietarioAnteriorId !== propietarioId
      ? `Propiedad "${propiedad.direccion}" reasignada a ${propietario.nombre || "el propietario"}`
      : `Propiedad "${propiedad.direccion}" asignada a ${propietario.nombre || "el propietario"}`

    console.log(`[propiedades] ${mensajeCambio}`)

    return NextResponse.json({
      success: true,
      message: mensajeCambio,
      cambioPropietario: propietarioAnteriorId && propietarioAnteriorId !== propietarioId
    })

  } catch (error) {
    console.error("[api/admin/propietarios/[id]/propiedades POST]", error)
    return NextResponse.json({ error: "Error al asignar propiedad" }, { status: 500 })
  }
}

// DELETE - Quitar asignación de una propiedad (asignar al admin que hace la solicitud)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Solo administradores pueden quitar propiedades" }, { status: 403 })
  }

  const { id: propietarioId } = await params
  const { searchParams } = new URL(request.url)
  const propiedadId = searchParams.get("propiedadId")

  if (!propiedadId) {
    return NextResponse.json({ error: "Se requiere propiedadId" }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    // Verificar que la propiedad existe y pertenece al propietario
    const { data: propiedad, error: errProp } = await admin
      .from("propiedades")
      .select("id, user_id, direccion, ciudad")
      .eq("id", propiedadId)
      .single()

    if (errProp || !propiedad) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
    }

    if (propiedad.user_id !== propietarioId) {
      return NextResponse.json({ error: "La propiedad no pertenece a este propietario" }, { status: 400 })
    }

    // Como user_id es NOT NULL, asignamos temporalmente al admin que hace la solicitud
    // Esto es seguro porque el admin puede reasignarla después
    const { error } = await admin
      .from("propiedades")
      .update({ user_id: user.id })
      .eq("id", propiedadId)
      .eq("user_id", propietarioId)

    if (error) {
      console.error("[api/admin/propietarios/[id]/propiedades DELETE]", error)
      return NextResponse.json({ error: "Error al quitar propiedad" }, { status: 500 })
    }

    console.log(`[propiedades] Propiedad ${propiedad.direccion} (${propiedad.ciudad}) quitada de ${propietarioId}, asignada temporalmente al admin ${user.email}`)

    return NextResponse.json({
      success: true,
      message: `Propiedad "${propiedad.direccion}" quitada del propietario`
    })

  } catch (error) {
    console.error("[api/admin/propietarios/[id]/propiedades DELETE]", error)
    return NextResponse.json({ error: "Error al quitar propiedad" }, { status: 500 })
  }
}
