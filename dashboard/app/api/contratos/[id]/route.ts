import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Obtener un contrato específico con todos sus datos
export async function GET(request: Request, context: RouteContext) {
  console.log("🔵 [contratos] GET individual iniciado")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("❌ No hay usuario autenticado")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  console.log("✓ Usuario:", user.id, user.email)

  // Obtener rol
  let role: string | null = null
  try {
    role = await getUserRole(supabase, user)
    console.log("✓ Rol obtenido:", role)
  } catch (err: any) {
    console.error("⚠️ Error obteniendo rol:", err?.message)
  }

  const { id } = await context.params
  console.log("✓ Buscando contrato ID:", id)

  // Usar admin client para evitar problemas con RLS
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("contratos")
    .select(`
      *,
      propiedad:propiedades(*),
      arrendatario:arrendatarios(*)
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("❌ Error obteniendo contrato:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    console.log("❌ Contrato no encontrado")
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  console.log("✓ Contrato encontrado:", {
    id: data.id,
    fecha_inicio: data.fecha_inicio,
    fecha_fin: data.fecha_fin,
    canon_mensual: data.canon_mensual,
    ciudad_firma: data.ciudad_firma,
    propiedad_id: data.propiedad_id,
    arrendatario_id: data.arrendatario_id,
    tiene_propiedad: !!data.propiedad,
    tiene_arrendatario: !!data.arrendatario,
    propiedad_direccion: data.propiedad?.direccion,
    arrendatario_nombre: data.arrendatario?.nombre,
  })

  // Verificar permisos: admin puede ver todos, propietario solo los suyos
  if (role !== "admin" && data.user_id !== user.id) {
    console.log("❌ Usuario no tiene permiso para ver este contrato")
    return NextResponse.json({ error: "No tienes permiso para ver este contrato" }, { status: 403 })
  }

  // Obtener información del propietario
  if (data.propiedad?.user_id) {
    const { data: propietario } = await admin
      .from("perfiles")
      .select("id, email, nombre")
      .eq("id", data.propiedad.user_id)
      .single()

    if (propietario) {
      data.propietario = propietario
      console.log("✓ Propietario agregado:", propietario)
    } else {
      console.log("⚠️ No se encontró propietario para ID:", data.propiedad.user_id)
    }
  }

  console.log("✓ Retornando contrato completo")
  return NextResponse.json(data)
}

// PATCH - Actualizar un contrato
export async function PATCH(request: Request, context: RouteContext) {
  console.log("🔵 [contratos] PATCH iniciado")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("❌ No hay usuario autenticado")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Obtener rol
  let role: string | null = null
  try {
    role = await getUserRole(supabase, user)
    console.log("✓ Rol obtenido:", role)
  } catch (err: any) {
    console.error("⚠️ Error obteniendo rol:", err?.message)
  }

  const { id } = await context.params
  const body = await request.json()
  console.log("✓ Actualizando contrato ID:", id, "con datos:", body)

  // Para admin, usar admin client para evitar problemas con RLS
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const adminClient = createAdminClient()

  // Verificar el estado anterior del contrato
  const { data: contratoActual } = await adminClient
    .from("contratos")
    .select("estado, propiedad_id")
    .eq("id", id)
    .single()

  // Construir la query de actualización
  let updateQuery = adminClient
    .from("contratos")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  // Solo propietarios necesitan verificar user_id, admin puede editar cualquier contrato
  if (role !== "admin") {
    updateQuery = updateQuery.eq("user_id", user.id)
  }

  const { data, error } = await updateQuery
    .select(`
      *,
      propiedad:propiedades(*),
      arrendatario:arrendatarios(*)
    `)
    .single()

  if (error) {
    console.error("❌ Error actualizando contrato:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    console.log("❌ Contrato no encontrado")
    return NextResponse.json({ error: "Contrato no encontrado o no tienes permiso" }, { status: 404 })
  }

  console.log("✓ Contrato actualizado, nuevo estado:", data.estado)

  // Si el estado cambió a "terminado" o "vencido", liberar la propiedad
  if (contratoActual && contratoActual.estado !== data.estado) {
    if (data.estado === "terminado" || data.estado === "vencido") {
      console.log("✓ Contrato terminado/vencido, liberando propiedad...")
      const { error: updateError } = await adminClient
        .from("propiedades")
        .update({ estado: "disponible" })
        .eq("id", data.propiedad_id)

      if (updateError) {
        console.error("⚠️ Error liberando propiedad:", updateError.message)
      } else {
        console.log("✓ Propiedad liberada (marcada como disponible)")
      }
    }
    // Si el estado cambió a "activo" y la propiedad no está arrendada, marcarla como arrendada
    else if (data.estado === "activo") {
      console.log("✓ Contrato activado, marcando propiedad como arrendada...")
      const { error: updateError } = await adminClient
        .from("propiedades")
        .update({ estado: "arrendado" })
        .eq("id", data.propiedad_id)

      if (updateError) {
        console.error("⚠️ Error marcando propiedad como arrendada:", updateError.message)
      } else {
        console.log("✓ Propiedad marcada como arrendada")
      }
    }
  }

  // Obtener información del propietario
  if (data.propiedad?.user_id) {
    const { data: propietario } = await adminClient
      .from("perfiles")
      .select("id, email, nombre")
      .eq("id", data.propiedad.user_id)
      .single()

    if (propietario) {
      data.propietario = propietario
    }
  }

  return NextResponse.json(data)
}

// DELETE - Eliminar un contrato
export async function DELETE(request: Request, context: RouteContext) {
  console.log("🔵 [contratos] DELETE iniciado")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("❌ No hay usuario autenticado")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Obtener rol
  let role: string | null = null
  try {
    role = await getUserRole(supabase, user)
    console.log("✓ Rol obtenido:", role)
  } catch (err: any) {
    console.error("⚠️ Error obteniendo rol:", err?.message)
  }

  const { id } = await context.params
  console.log("✓ Eliminando contrato ID:", id)

  // Primero obtener el contrato para saber la propiedad asociada
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const admin = createAdminClient()

  const { data: contrato } = await admin
    .from("contratos")
    .select("propiedad_id")
    .eq("id", id)
    .single()

  if (!contrato) {
    console.log("❌ Contrato no encontrado")
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  console.log("✓ Contrato encontrado, propiedad_id:", contrato.propiedad_id)

  // Construir la query de eliminación usando admin client para evitar problemas con RLS
  let deleteQuery = admin
    .from("contratos")
    .delete()
    .eq("id", id)

  // Solo propietarios necesitan verificar user_id, admin puede eliminar cualquier contrato
  if (role !== "admin") {
    deleteQuery = deleteQuery.eq("user_id", user.id)
  }

  const { error } = await deleteQuery

  if (error) {
    console.error("❌ Error eliminando contrato:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log("✓ Contrato eliminado exitosamente")

  // Actualizar el estado de la propiedad a "disponible"
  console.log("✓ Actualizando estado de la propiedad a disponible...")
  const { error: updateError } = await admin
    .from("propiedades")
    .update({ estado: "disponible" })
    .eq("id", contrato.propiedad_id)

  if (updateError) {
    console.error("⚠️ Error actualizando estado de propiedad:", updateError.message)
    // No fallamos el proceso si no se puede actualizar la propiedad
    // El contrato ya fue eliminado
  } else {
    console.log("✓ Propiedad marcada como disponible")
  }

  return NextResponse.json({ success: true })
}
