import { NextResponse } from "next/server"

// GET - Obtener un contrato específico con relaciones
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id
  console.log("🔵 [contratos/{id}] GET - contrato:", contratoId)

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const { getUserRole } = await import("@/lib/auth/role")

    const supabase = await createClient()
    const authData = await supabase.auth.getUser()
    const user = authData.data?.user

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = await getUserRole(supabase, user)
    if (!role || (role !== "admin" && role !== "propietario")) {
      return NextResponse.json({ error: "No tienes permiso" }, { status: 403 })
    }

    const admin = createAdminClient()

    // Obtener contrato con relaciones
    const { data: contrato, error } = await admin
      .from("contratos")
      .select(`
        *,
        propiedad:propiedades (
          id,
          direccion,
          ciudad,
          barrio,
          matricula_inmobiliaria,
          numero_matricula,
          valor_arriendo,
          user_id
        ),
        arrendatario:arrendatarios (
          id,
          nombre,
          cedula,
          email,
          celular
        )
      `)
      .eq("id", contratoId)
      .single()

    if (error) {
      console.error("❌ Error obteniendo contrato:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!contrato) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
    }

    // Verificar permisos: propietario solo puede ver sus propios contratos
    if (role === "propietario" && contrato.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para ver este contrato" }, { status: 403 })
    }

    // Obtener información del propietario
    const { data: propietario } = await admin
      .from("perfiles")
      .select("id, email, nombre")
      .eq("id", contrato.user_id)
      .single()

    const contratoConPropietario = {
      ...contrato,
      propietario,
    }

    console.log("✓ Contrato encontrado:", contrato.id)
    return NextResponse.json(contratoConPropietario)

  } catch (err: any) {
    console.error("❌ ERROR GENERAL:", err?.message || err)
    return NextResponse.json(
      { error: "Error interno del servidor", details: err?.message },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar un contrato
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id
  console.log("🟡 [contratos/{id}] PATCH - contrato:", contratoId)

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const { getUserRole } = await import("@/lib/auth/role")

    const supabase = await createClient()
    const authData = await supabase.auth.getUser()
    const user = authData.data?.user

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = await getUserRole(supabase, user)
    if (!role || (role !== "admin" && role !== "propietario")) {
      return NextResponse.json({ error: "No tienes permiso" }, { status: 403 })
    }

    const body = await request.json()
    const admin = createAdminClient()

    // Verificar que el contrato existe y pertenece al usuario
    const { data: contratoExistente } = await admin
      .from("contratos")
      .select("id, user_id")
      .eq("id", contratoId)
      .single()

    if (!contratoExistente) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
    }

    if (role === "propietario" && contratoExistente.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para editar este contrato" }, { status: 403 })
    }

    // Campos permitidos para editar
    const updates: Record<string, any> = {}

    if (body.propiedad_id !== undefined) updates.propiedad_id = body.propiedad_id
    if (body.arrendatario_id !== undefined) updates.arrendatario_id = body.arrendatario_id
    if (body.fecha_inicio !== undefined) updates.fecha_inicio = body.fecha_inicio
    if (body.duracion_meses !== undefined) updates.duracion_meses = Number(body.duracion_meses)
    if (body.canon_mensual !== undefined) updates.canon_mensual = Number(body.canon_mensual)
    if (body.ciudad_firma !== undefined) updates.ciudad_firma = body.ciudad_firma
    if (body.estado !== undefined) updates.estado = body.estado

    // Si cambia la propiedad, actualizar el user_id al del propietario de la nueva propiedad
    if (body.propiedad_id !== undefined) {
      const { data: nuevaPropiedad } = await admin
        .from("propiedades")
        .select("user_id")
        .eq("id", body.propiedad_id)
        .single()

      if (nuevaPropiedad) {
        updates.user_id = nuevaPropiedad.user_id
      }
    }

    // Actualizar contrato
    const { data: contrato, error } = await admin
      .from("contratos")
      .update(updates)
      .eq("id", contratoId)
      .select(`
        *,
        propiedad:propiedades (
          id,
          direccion,
          ciudad,
          barrio
        ),
        arrendatario:arrendatarios (
          id,
          nombre,
          cedula
        )
      `)
      .single()

    if (error) {
      console.error("❌ Error actualizando contrato:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("✓ Contrato actualizado:", contrato.id)
    return NextResponse.json(contrato)

  } catch (err: any) {
    console.error("❌ ERROR GENERAL:", err?.message || err)
    return NextResponse.json(
      { error: "Error interno del servidor", details: err?.message },
      { status: 500 }
    )
  }
}
