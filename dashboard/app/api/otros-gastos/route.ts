import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Lista gastos diversos.
 * Admin: todos. Propietario: solo los de sus propiedades.
 * Requiere sesión; rechaza a inquilinos.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") {
    return NextResponse.json({ error: "No autorizado para ver otros gastos" }, { status: 403 })
  }

  const admin = createAdminClient()

  if (role === "admin") {
    const { data, error } = await admin
      .from("otros_gastos")
      .select(
        `
        id,
        propiedad_id,
        user_id,
        nombre_completo,
        cedula,
        tarjeta_profesional,
        correo_electronico,
        motivo_pago,
        descripcion_trabajo,
        fecha_realizacion,
        valor,
        banco,
        referencia_pago,
        numero_recibo,
        fecha_emision,
        estado,
        created_at,
        updated_at,
        propiedades ( id, direccion, ciudad, barrio, titulo ),
        users ( email )
        `
      )
      .order("fecha_emision", { ascending: false })

    if (error) {
      console.error("[otros-gastos GET]", error)
      return NextResponse.json({ error: "Error al listar gastos" }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  }

  // propietario: solo sus propios registros
  const { data, error } = await admin
    .from("otros_gastos")
    .select(
      `
      id,
      propiedad_id,
      user_id,
      nombre_completo,
      cedula,
      tarjeta_profesional,
      correo_electronico,
      motivo_pago,
      descripcion_trabajo,
      fecha_realizacion,
      valor,
      banco,
      referencia_pago,
      numero_recibo,
      fecha_emision,
      estado,
      created_at,
      updated_at,
      propiedades ( id, direccion, ciudad, barrio, titulo ),
      users ( email )
      `
    )
    .eq("user_id", user.id)
    .order("fecha_emision", { ascending: false })

  if (error) {
    console.error("[otros-gastos GET]", error)
    return NextResponse.json({ error: "Error al listar gastos" }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

/**
 * POST - Crea un nuevo registro de otro gasto.
 * Solo propietarios y admin.
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
  if (role !== "propietario" && role !== "admin") {
    return NextResponse.json({ error: "No autorizado para crear gastos" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const {
    propiedad_id,
    nombre_completo,
    cedula,
    tarjeta_profesional,
    correo_electronico,
    motivo_pago,
    descripcion_trabajo,
    fecha_realizacion,
    valor,
    banco,
    referencia_pago,
  } = body as Record<string, unknown>

  // Validaciones
  if (
    typeof propiedad_id !== "string" ||
    typeof nombre_completo !== "string" ||
    typeof cedula !== "string" ||
    typeof motivo_pago !== "string" ||
    typeof descripcion_trabajo !== "string" ||
    typeof valor !== "number"
  ) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: propiedad_id, nombre_completo, cedula, motivo_pago, descripcion_trabajo, valor" },
      { status: 400 }
    )
  }

  const nombreTrim = nombre_completo.trim()
  const cedulaTrim = cedula.trim()
  const motivoTrim = motivo_pago.trim()
  const descripcionTrim = descripcion_trabajo.trim()

  if (!nombreTrim || !cedulaTrim || !motivoTrim || !descripcionTrim) {
    return NextResponse.json(
      { error: "Los campos requeridos no pueden estar vacíos" },
      { status: 400 }
    )
  }

  if (valor <= 0) {
    return NextResponse.json(
      { error: "El valor debe ser mayor a cero" },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Verificar que la propiedad existe y el usuario tiene acceso
  const { data: propiedad, error: errProp } = await admin
    .from("propiedades")
    .select("id, user_id, direccion, ciudad, titulo")
    .eq("id", propiedad_id.trim())
    .single()

  if (errProp || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  if (role === "propietario" && propiedad.user_id !== user.id) {
    return NextResponse.json(
      { error: "Solo puedes registrar gastos en tus propias propiedades" },
      { status: 403 }
    )
  }

  // Crear el registro
  const { data: inserted, error: errInsert } = await admin
    .from("otros_gastos")
    .insert({
      propiedad_id: propiedad_id.trim(),
      user_id: user.id,
      nombre_completo: nombreTrim,
      cedula: cedulaTrim,
      tarjeta_profesional: typeof tarjeta_profesional === "string" ? tarjeta_profesional.trim() : null,
      correo_electronico: typeof correo_electronico === "string" ? correo_electronico.trim() : null,
      motivo_pago: motivoTrim,
      descripcion_trabajo: descripcionTrim,
      fecha_realizacion: typeof fecha_realizacion === "string" ? fecha_realizacion : new Date().toISOString().split('T')[0],
      valor,
      banco: typeof banco === "string" ? banco.trim() : null,
      referencia_pago: typeof referencia_pago === "string" ? referencia_pago.trim() : null,
      estado: "pendiente",
    })
    .select(`
      id,
      numero_recibo,
      propiedades ( id, direccion, ciudad, titulo )
    `)
    .single()

  if (errInsert) {
    console.error("[otros-gastos POST]", errInsert)
    return NextResponse.json({ error: "Error al guardar el gasto" }, { status: 500 })
  }

  return NextResponse.json({
    id: inserted?.id,
    numero_recibo: inserted?.numero_recibo,
    message: "Gasto registrado correctamente",
  })
}
