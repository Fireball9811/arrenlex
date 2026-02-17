import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Obtener datos del inquilino autenticado
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("arrendatarios")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  if (error) {
    // Si no hay datos, retornar null (no es error, es que no tiene datos aún)
    if (error.code === "PGRST116") {
      return NextResponse.json(null)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Crear o actualizar datos del inquilino
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Datos inválidos. Recarga la página e intenta de nuevo." },
      { status: 400 }
    )
  }

  const autorizacionDatos = body.autorizacion_datos === true
  if (!autorizacionDatos) {
    return NextResponse.json(
      { error: "Debe autorizar el manejo de sus datos personales según la política de privacidad." },
      { status: 400 }
    )
  }

  const numVehiculos = Number(body.vehiculos_cantidad ?? 0)
  const placas = typeof body.vehiculos_placas === "string" ? body.vehiculos_placas.trim() : ""
  if (numVehiculos > 0 && !placas) {
    return NextResponse.json(
      { error: "Si indica vehículos, debe escribir las placas." },
      { status: 400 }
    )
  }

  // Validaciones básicas
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : ""
  const cedula = typeof body.cedula === "string" ? body.cedula.trim().replace(/\D/g, "") : ""
  const telefono = typeof body.telefono === "string" ? body.telefono.trim().replace(/\D/g, "") : ""

  if (!nombre || nombre.length < 10) {
    return NextResponse.json(
      { error: "El nombre completo es obligatorio (mínimo 10 caracteres)." },
      { status: 400 }
    )
  }
  if (!cedula) {
    return NextResponse.json(
      { error: "La cédula es obligatoria." },
      { status: 400 }
    )
  }
  if (!telefono || telefono.length !== 10) {
    return NextResponse.json(
      { error: "El teléfono celular es obligatorio (10 dígitos)." },
      { status: 400 }
    )
  }

  // Coarrendatario (opcional para inquilinos)
  const coarrendatarioNombre = typeof body.coarrendatario_nombre === "string" ? body.coarrendatario_nombre.trim() : ""
  const coarrendatarioCedula = typeof body.coarrendatario_cedula === "string" ? body.coarrendatario_cedula.trim().replace(/\D/g, "") : ""
  const coarrendatarioTelefono = typeof body.coarrendatario_telefono === "string" ? body.coarrendatario_telefono.trim().replace(/\D/g, "") : ""

  const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const toStr = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)

  // Validación de coarrendatario si se proporciona
  if (coarrendatarioNombre) {
    if (coarrendatarioNombre.length < 10) {
      return NextResponse.json(
        { error: "El nombre del coarrendatario debe tener al menos 10 caracteres." },
        { status: 400 }
      )
    }
    if (!coarrendatarioCedula) {
      return NextResponse.json(
        { error: "La cédula del coarrendatario es obligatoria." },
        { status: 400 }
      )
    }
    if (!coarrendatarioTelefono || coarrendatarioTelefono.length !== 10) {
      return NextResponse.json(
        { error: "El teléfono del coarrendatario es obligatorio (10 dígitos)." },
        { status: 400 }
      )
    }
    if (cedula === coarrendatarioCedula) {
      return NextResponse.json(
        { error: "La cédula del coarrendatario debe ser distinta a la del titular." },
        { status: 400 }
      )
    }
    if (telefono === coarrendatarioTelefono) {
      return NextResponse.json(
        { error: "El teléfono del coarrendatario debe ser distinto al del titular." },
        { status: 400 }
      )
    }
  }

  // Referencias
  const refPersonal1Cedula = typeof body.ref_personal_1_cedula === "string" ? body.ref_personal_1_cedula.trim().replace(/\D/g, "") : ""
  const refPersonal1Telefono = typeof body.ref_personal_1_telefono === "string" ? body.ref_personal_1_telefono.trim().replace(/\D/g, "") : ""
  const refPersonal2Cedula = typeof body.ref_personal_2_cedula === "string" ? body.ref_personal_2_cedula.trim().replace(/\D/g, "") : ""
  const refPersonal2Telefono = typeof body.ref_personal_2_telefono === "string" ? body.ref_personal_2_telefono.trim().replace(/\D/g, "") : ""
  const refFamiliar1Cedula = typeof body.ref_familiar_1_cedula === "string" ? body.ref_familiar_1_cedula.trim().replace(/\D/g, "") : ""
  const refFamiliar1Telefono = typeof body.ref_familiar_1_telefono === "string" ? body.ref_familiar_1_telefono.trim().replace(/\D/g, "") : ""
  const refFamiliar2Cedula = typeof body.ref_familiar_2_cedula === "string" ? body.ref_familiar_2_cedula.trim().replace(/\D/g, "") : ""
  const refFamiliar2Telefono = typeof body.ref_familiar_2_telefono === "string" ? body.ref_familiar_2_telefono.trim().replace(/\D/g, "") : ""

  const cedulas: string[] = [cedula]
  if (coarrendatarioCedula) cedulas.push(coarrendatarioCedula)
  if (refPersonal1Cedula) cedulas.push(refPersonal1Cedula)
  if (refPersonal2Cedula) cedulas.push(refPersonal2Cedula)
  if (refFamiliar1Cedula) cedulas.push(refFamiliar1Cedula)
  if (refFamiliar2Cedula) cedulas.push(refFamiliar2Cedula)
  const cedulasUnicas = new Set(cedulas)
  if (cedulasUnicas.size !== cedulas.length) {
    return NextResponse.json(
      { error: "Todas las cédulas deben ser diferentes (titular, coarrendatario y referencias)." },
      { status: 400 }
    )
  }

  const telefonos: string[] = [telefono]
  if (coarrendatarioTelefono) telefonos.push(coarrendatarioTelefono)
  if (refPersonal1Telefono) telefonos.push(refPersonal1Telefono)
  if (refPersonal2Telefono) telefonos.push(refPersonal2Telefono)
  if (refFamiliar1Telefono) telefonos.push(refFamiliar1Telefono)
  if (refFamiliar2Telefono) telefonos.push(refFamiliar2Telefono)
  const telefonosUnicos = new Set(telefonos)
  if (telefonosUnicos.size !== telefonos.length) {
    return NextResponse.json(
      { error: "Todos los teléfonos deben ser diferentes (titular, coarrendatario y referencias)." },
      { status: 400 }
    )
  }

  // Verificar si ya existe un registro para actualizar o insertar
  const { data: existing } = await supabase
    .from("arrendatarios")
    .select("id")
    .eq("user_id", user.id)
    .single()

  const datosInquilino = {
    user_id: user.id,
    adultos_habitantes: toNum(body.adultos_habitantes),
    ninos_habitantes: toNum(body.ninos_habitantes),
    mascotas_cantidad: toNum(body.mascotas_cantidad),
    vehiculos_cantidad: toNum(body.vehiculos_cantidad),
    vehiculos_placas: toStr(body.vehiculos_placas),
    autorizacion_datos: true,
    nombre,
    cedula,
    telefono,
    coarrendatario_nombre: coarrendatarioNombre || null,
    coarrendatario_cedula: coarrendatarioCedula || null,
    coarrendatario_telefono: coarrendatarioTelefono || null,
    salario_principal: toNum(body.salario_principal),
    salario_secundario: toNum(body.salario_secundario),
    empresa_principal: toStr(body.empresa_principal),
    empresa_secundaria: toStr(body.empresa_secundaria),
    tiempo_servicio_principal_meses: toNum(body.tiempo_servicio_principal_meses),
    tiempo_servicio_secundario_meses: toNum(body.tiempo_servicio_secundario_meses),
    ref_familiar_1_nombre: toStr(body.ref_familiar_1_nombre),
    ref_familiar_1_parentesco: toStr(body.ref_familiar_1_parentesco),
    ref_familiar_1_cedula: refFamiliar1Cedula || null,
    ref_familiar_1_telefono: refFamiliar1Telefono || null,
    ref_familiar_2_nombre: toStr(body.ref_familiar_2_nombre),
    ref_familiar_2_parentesco: toStr(body.ref_familiar_2_parentesco),
    ref_familiar_2_cedula: refFamiliar2Cedula || null,
    ref_familiar_2_telefono: refFamiliar2Telefono || null,
    ref_personal_1_nombre: toStr(body.ref_personal_1_nombre),
    ref_personal_1_cedula: refPersonal1Cedula || null,
    ref_personal_1_telefono: refPersonal1Telefono || null,
    ref_personal_2_nombre: toStr(body.ref_personal_2_nombre),
    ref_personal_2_cedula: refPersonal2Cedula || null,
    ref_personal_2_telefono: refPersonal2Telefono || null,
  }

  let result
  if (existing) {
    // Actualizar registro existente
    const { data, error } = await supabase
      .from("arrendatarios")
      .update(datosInquilino)
      .eq("id", existing.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    result = data
  } else {
    // Crear nuevo registro
    const { data, error } = await supabase
      .from("arrendatarios")
      .insert(datosInquilino)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    result = data
  }

  return NextResponse.json(result)
}
