import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

/** Convierte errores de Supabase/Postgres en mensajes que entienda el usuario. */
function mensajeErrorParaUsuario(error: { message?: string; code?: string }): string {
  const msg = (error.message ?? "").toLowerCase()
  const code = error.code ?? ""

  // Cédula, teléfono o nombre vacíos / not null
  if (code === "23502" || msg.includes("null value") || msg.includes("violates not-null")) {
    if (msg.includes("nombre")) return "El nombre completo es obligatorio."
    if (msg.includes("cedula")) return "La cédula es obligatoria."
    if (msg.includes("telefono")) return "El teléfono es obligatorio."
    return "Faltan datos obligatorios. Revisa nombre, cédula y teléfono."
  }

  // Ya existe un registro para este usuario (unique)
  if (code === "23505" || msg.includes("duplicate key") || msg.includes("unique")) {
    return "Ya tienes tus datos registrados. Si necesitas actualizarlos, contacta al administrador."
  }

  // Permiso denegado (RLS)
  if (code === "42501" || msg.includes("policy") || msg.includes("row-level security")) {
    return "No tienes permiso para guardar estos datos. Cierra sesión y vuelve a entrar."
  }

  // Columna inexistente (ej. coarrendatario si la tabla no se actualizó)
  if (code === "42703" || msg.includes("column") && msg.includes("does not exist")) {
    return "Error de configuración del sistema. Contacta al administrador."
  }

  // Límite de caracteres o formato
  if (code === "22001" || msg.includes("value too long")) {
    return "Algún dato es demasiado largo. Acorta el texto e intenta de nuevo."
  }

  // Mensaje genérico si viene algo legible del servidor
  if (error.message && error.message.length < 200) {
    return error.message
  }

  return "No se pudo guardar. Intenta de nuevo o contacta al administrador si sigue fallando."
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No has iniciado sesión. Inicia sesión e intenta de nuevo." }, { status: 401 })
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

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : ""
  const cedula = typeof body.cedula === "string" ? body.cedula.trim().replace(/\D/g, "") : ""
  const telefono = typeof body.telefono === "string" ? body.telefono.trim().replace(/\D/g, "") : ""
  const coarrendatarioNombre = typeof body.coarrendatario_nombre === "string" ? body.coarrendatario_nombre.trim() : ""
  const coarrendatarioCedula = typeof body.coarrendatario_cedula === "string" ? body.coarrendatario_cedula.trim().replace(/\D/g, "") : ""
  const coarrendatarioTelefono = typeof body.coarrendatario_telefono === "string" ? body.coarrendatario_telefono.trim().replace(/\D/g, "") : ""

  if (!nombre) {
    return NextResponse.json(
      { error: "El nombre completo del titular es obligatorio." },
      { status: 400 }
    )
  }
  if (nombre.length < 10) {
    return NextResponse.json(
      { error: "El nombre completo del titular debe tener al menos 10 caracteres." },
      { status: 400 }
    )
  }
  if (!cedula) {
    return NextResponse.json(
      { error: "La cédula del titular es obligatoria." },
      { status: 400 }
    )
  }
  if (!telefono) {
    return NextResponse.json(
      { error: "El teléfono celular del titular es obligatorio." },
      { status: 400 }
    )
  }
  if (telefono.length !== 10) {
    return NextResponse.json(
      { error: "El teléfono del titular debe tener exactamente 10 dígitos." },
      { status: 400 }
    )
  }

  if (!coarrendatarioNombre) {
    return NextResponse.json(
      { error: "El nombre del coarrendatario es obligatorio (debe ser otra persona)." },
      { status: 400 }
    )
  }
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
  if (!coarrendatarioTelefono) {
    return NextResponse.json(
      { error: "El teléfono celular del coarrendatario es obligatorio." },
      { status: 400 }
    )
  }
  if (coarrendatarioTelefono.length !== 10) {
    return NextResponse.json(
      { error: "El teléfono del coarrendatario debe tener exactamente 10 dígitos." },
      { status: 400 }
    )
  }

  if (cedula === coarrendatarioCedula) {
    return NextResponse.json(
      { error: "La cédula del coarrendatario debe ser distinta a la del titular (deben ser dos personas diferentes)." },
      { status: 400 }
    )
  }
  if (telefono === coarrendatarioTelefono) {
    return NextResponse.json(
      { error: "El teléfono del coarrendatario debe ser distinto al del titular." },
      { status: 400 }
    )
  }

  const refPersonal1Cedula = typeof body.ref_personal_1_cedula === "string" ? body.ref_personal_1_cedula.trim().replace(/\D/g, "") : ""
  const refPersonal1Telefono = typeof body.ref_personal_1_telefono === "string" ? body.ref_personal_1_telefono.trim().replace(/\D/g, "") : ""
  const refPersonal2Cedula = typeof body.ref_personal_2_cedula === "string" ? body.ref_personal_2_cedula.trim().replace(/\D/g, "") : ""
  const refPersonal2Telefono = typeof body.ref_personal_2_telefono === "string" ? body.ref_personal_2_telefono.trim().replace(/\D/g, "") : ""
  const refFamiliar1Cedula = typeof body.ref_familiar_1_cedula === "string" ? body.ref_familiar_1_cedula.trim().replace(/\D/g, "") : ""
  const refFamiliar1Telefono = typeof body.ref_familiar_1_telefono === "string" ? body.ref_familiar_1_telefono.trim().replace(/\D/g, "") : ""
  const refFamiliar2Cedula = typeof body.ref_familiar_2_cedula === "string" ? body.ref_familiar_2_cedula.trim().replace(/\D/g, "") : ""
  const refFamiliar2Telefono = typeof body.ref_familiar_2_telefono === "string" ? body.ref_familiar_2_telefono.trim().replace(/\D/g, "") : ""

  const cedulas: string[] = [cedula, coarrendatarioCedula]
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

  const telefonos: string[] = [telefono, coarrendatarioTelefono]
  const addTelefono = (tel: string, label: string) => {
    if (!tel) return
    if (tel.length !== 10) {
      throw { status: 400, error: `El teléfono de ${label} debe tener 10 dígitos.` }
    }
    telefonos.push(tel)
  }
  try {
    addTelefono(refPersonal1Telefono, "la referencia personal 1")
    addTelefono(refPersonal2Telefono, "la referencia personal 2")
    addTelefono(refFamiliar1Telefono, "la referencia familiar 1")
    addTelefono(refFamiliar2Telefono, "la referencia familiar 2")
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err && "error" in err) {
      return NextResponse.json({ error: (err as { error: string }).error }, { status: 400 })
    }
    throw err
  }
  const telefonosUnicos = new Set(telefonos)
  if (telefonosUnicos.size !== telefonos.length) {
    return NextResponse.json(
      { error: "Todos los teléfonos deben ser diferentes (titular, coarrendatario y referencias)." },
      { status: 400 }
    )
  }

  const refFamiliar1Nombre = typeof body.ref_familiar_1_nombre === "string" ? body.ref_familiar_1_nombre.trim() : ""
  const refFamiliar2Nombre = typeof body.ref_familiar_2_nombre === "string" ? body.ref_familiar_2_nombre.trim() : ""
  const refPersonal1Nombre = typeof body.ref_personal_1_nombre === "string" ? body.ref_personal_1_nombre.trim() : ""
  const refPersonal2Nombre = typeof body.ref_personal_2_nombre === "string" ? body.ref_personal_2_nombre.trim() : ""
  if (refFamiliar1Nombre && refFamiliar1Nombre.length < 10) {
    return NextResponse.json(
      { error: "El nombre de la referencia familiar 1 debe tener al menos 10 caracteres." },
      { status: 400 }
    )
  }
  if (refFamiliar2Nombre && refFamiliar2Nombre.length < 10) {
    return NextResponse.json(
      { error: "El nombre de la referencia familiar 2 debe tener al menos 10 caracteres." },
      { status: 400 }
    )
  }
  if (refPersonal1Nombre && refPersonal1Nombre.length < 10) {
    return NextResponse.json(
      { error: "El nombre de la referencia personal 1 debe tener al menos 10 caracteres." },
      { status: 400 }
    )
  }
  if (refPersonal2Nombre && refPersonal2Nombre.length < 10) {
    return NextResponse.json(
      { error: "El nombre de la referencia personal 2 debe tener al menos 10 caracteres." },
      { status: 400 }
    )
  }

  const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const toStr = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)

  const { data, error } = await supabase
    .from("arrendatarios")
    .insert({
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
      coarrendatario_nombre: coarrendatarioNombre,
      coarrendatario_cedula: coarrendatarioCedula,
      coarrendatario_telefono: coarrendatarioTelefono,
      salario_principal: toNum(body.salario_principal),
      salario_secundario: toNum(body.salario_secundario),
      empresa_principal: toStr(body.empresa_principal),
      empresa_secundaria: toStr(body.empresa_secundaria),
      tiempo_servicio_principal_meses: toNum(body.tiempo_servicio_principal_meses),
      tiempo_servicio_secundario_meses: toNum(body.tiempo_servicio_secundario_meses),
      ref_familiar_1_nombre: refFamiliar1Nombre || null,
      ref_familiar_1_parentesco: toStr(body.ref_familiar_1_parentesco),
      ref_familiar_1_cedula: refFamiliar1Cedula || null,
      ref_familiar_1_telefono: refFamiliar1Telefono || null,
      ref_familiar_2_nombre: refFamiliar2Nombre || null,
      ref_familiar_2_parentesco: toStr(body.ref_familiar_2_parentesco),
      ref_familiar_2_cedula: refFamiliar2Cedula || null,
      ref_familiar_2_telefono: refFamiliar2Telefono || null,
      ref_personal_1_nombre: refPersonal1Nombre || null,
      ref_personal_1_cedula: refPersonal1Cedula || null,
      ref_personal_1_telefono: refPersonal1Telefono || null,
      ref_personal_2_nombre: refPersonal2Nombre || null,
      ref_personal_2_cedula: refPersonal2Cedula || null,
      ref_personal_2_telefono: refPersonal2Telefono || null,
    })
    .select()
    .single()

  if (error) {
    const mensaje = mensajeErrorParaUsuario(error)
    const status = error.code === "23505" ? 409 : error.code === "23502" ? 400 : 500
    return NextResponse.json({ error: mensaje }, { status })
  }

  return NextResponse.json(data)
}
