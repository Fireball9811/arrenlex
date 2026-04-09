import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Obtiene un arrendatario por ID (admin y propietario)
 * Los propietarios solo pueden ver arrendatarios con contrato en sus propiedades
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { id } = await params

  // Obtener rol del usuario
  const role = await getUserRole(supabase, user)

  // Verificar permisos según rol
  if (role === "admin") {
    // Admin puede ver cualquier arrendatario
    const { data, error } = await admin
      .from("arrendatarios")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Arrendatario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(data)
  }

  if (role === "propietario") {
    // Propietario solo puede ver arrendatarios con contrato en sus propiedades
    // Primero verificar que el arrendatario tiene un contrato con una propiedad del propietario
    const { data: contrato, error: contratoError } = await admin
      .from("contratos")
      .select(`
        *,
        propiedad:propiedades (
          id,
          direccion,
          user_id
        )
      `)
      .eq("arrendatario_id", id)
      .eq("user_id", user.id)
      .single()

    if (contratoError || !contrato) {
      return NextResponse.json({ error: "No tienes permiso para ver este arrendatario. Solo puedes ver arrendatarios con contrato activo en tus propiedades." }, { status: 403 })
    }

    // Obtener datos del arrendatario
    const { data, error } = await admin
      .from("arrendatarios")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Arrendatario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(data)
  }

  return NextResponse.json({ error: "No tienes permiso para realizar esta acción" }, { status: 403 })
}

/**
 * PUT - Actualiza un arrendatario por ID (admin y propietario)
 * Los propietarios solo pueden editar arrendatarios con contrato en sus propiedades
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { id } = await params

  // Obtener rol del usuario
  const role = await getUserRole(supabase, user)

  // Verificar permisos según rol
  if (role === "admin") {
    // Admin puede editar cualquier arrendatario
    // Continuar con la actualización
  } else if (role === "propietario") {
    // Propietario solo puede editar arrendatarios con contrato en sus propiedades
    const { data: contrato } = await admin
      .from("contratos")
      .select("id")
      .eq("arrendatario_id", id)
      .eq("user_id", user.id)
      .single()

    if (!contrato) {
      return NextResponse.json({ error: "No tienes permiso para editar este arrendatario. Solo puedes editar arrendatarios con contrato activo en tus propiedades." }, { status: 403 })
    }
  } else {
    return NextResponse.json({ error: "No tienes permiso para realizar esta acción" }, { status: 403 })
  }

  try {
    const body = await request.json()

    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }

    const toStr = (v: unknown): string | null =>
      typeof v === "string" && v.trim() ? v.trim() : null

    const { data, error } = await admin
      .from("arrendatarios")
      .update({
        nombre: toStr(body.nombre),
        cedula: toStr(body.cedula),
        telefono: toStr(body.telefono),
        email: toStr(body.email),
        celular: toStr(body.celular),
        adultos_habitantes: toNum(body.adultos_habitantes),
        ninos_habitantes: toNum(body.ninos_habitantes),
        mascotas_cantidad: toNum(body.mascotas_cantidad),
        vehiculos_cantidad: toNum(body.vehiculos_cantidad),
        vehiculos_placas: toStr(body.vehiculos_placas),
        coarrendatario_nombre: toStr(body.coarrendatario_nombre),
        coarrendatario_cedula: toStr(body.coarrendatario_cedula),
        coarrendatario_telefono: toStr(body.coarrendatario_telefono),
        coarrendatario_email: toStr(body.coarrendatario_email),
        salario_principal: toNum(body.salario_principal),
        salario_secundario: toNum(body.salario_secundario),
        empresa_principal: toStr(body.empresa_principal),
        empresa_secundaria: toStr(body.empresa_secundaria),
        tiempo_servicio_principal_meses: toNum(body.tiempo_servicio_principal_meses),
        tiempo_servicio_secundario_meses: toNum(body.tiempo_servicio_secundario_meses),
        ref_familiar_1_nombre: toStr(body.ref_familiar_1_nombre),
        ref_familiar_1_parentesco: toStr(body.ref_familiar_1_parentesco),
        ref_familiar_1_cedula: toStr(body.ref_familiar_1_cedula),
        ref_familiar_1_telefono: toStr(body.ref_familiar_1_telefono),
        ref_familiar_2_nombre: toStr(body.ref_familiar_2_nombre),
        ref_familiar_2_parentesco: toStr(body.ref_familiar_2_parentesco),
        ref_familiar_2_cedula: toStr(body.ref_familiar_2_cedula),
        ref_familiar_2_telefono: toStr(body.ref_familiar_2_telefono),
        ref_personal_1_nombre: toStr(body.ref_personal_1_nombre),
        ref_personal_1_cedula: toStr(body.ref_personal_1_cedula),
        ref_personal_1_telefono: toStr(body.ref_personal_1_telefono),
        ref_personal_2_nombre: toStr(body.ref_personal_2_nombre),
        ref_personal_2_cedula: toStr(body.ref_personal_2_cedula),
        ref_personal_2_telefono: toStr(body.ref_personal_2_telefono),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }
}

/**
 * DELETE - Eliminar un arrendatario por ID
 * NOTA: Esto solo elimina el arrendatario, NO elimina el usuario asociado
 * Permite eliminar arrendatarios vinculados a la propia cuenta del admin
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { id } = await params

  // Verificar que el usuario es admin
  const { data: perfil } = await admin
    .from("perfiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!perfil || perfil.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden eliminar arrendatarios" }, { status: 403 })
  }

  try {
    // Verificar que el arrendatario existe
    const { data: arrendatario, error: fetchError } = await admin
      .from("arrendatarios")
      .select("id, nombre, user_id")
      .eq("id", id)
      .single()

    if (fetchError || !arrendatario) {
      return NextResponse.json({ error: "Arrendatario no encontrado" }, { status: 404 })
    }

    console.log("[DELETE /api/admin/arrendatarios/[id]] Eliminando arrendatario:", arrendatario)

    // Eliminar el arrendatario (NO el usuario)
    const { error: deleteError } = await admin
      .from("arrendatarios")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[DELETE /api/admin/arrendatarios/[id]] Error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Arrendatario eliminado exitosamente",
      arrendatario: {
        id: arrendatario.id,
        nombre: arrendatario.nombre
      }
    })

  } catch (err) {
    console.error("[DELETE /api/admin/arrendatarios/[id]] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar arrendatario" },
      { status: 500 }
    )
  }
}
