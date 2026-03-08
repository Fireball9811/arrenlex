import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendAplicacionEmail } from "@/lib/email/send-aplicacion"
import { sendWhatsAppCEO, buildAplicacionWhatsAppText } from "@/lib/whatsapp/send-whatsapp"

/**
 * POST /api/intake/aplicacion
 *
 * Endpoint público (sin auth) que recibe el formulario de aplicación de arrendamiento
 * enviado desde el wizard del catálogo.
 *
 * Valida:
 *  - autorizacion === "Si" (obligatorio)
 *  - propiedad_id existe y está disponible
 *  - campos requeridos del arrendatario
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const {
    propiedad_id,
    // Paso 1 — Arrendatario
    nombre,
    email,
    cedula,
    fecha_expedicion_cedula,
    telefono,
    // Paso 2 — Laboral arrendatario
    empresa_arrendatario,
    antiguedad_meses,
    salario,
    ingresos,
    // Paso 3 — Coarrendatario (todos opcionales)
    nombre_coarrendatario,
    cedula_coarrendatario,
    fecha_expedicion_cedula_coarrendatario,
    empresa_coarrendatario,
    antiguedad_meses_2,
    salario_2,
    telefono_coarrendatario,
    // Paso 4 — Hogar y autorización
    personas,
    ninos,
    mascotas,
    personas_trabajan,
    negocio,
    autorizacion,
  } = body as Record<string, unknown>

  // Validar autorización — bloquear si no es "Si"
  if (autorizacion !== "Si") {
    return NextResponse.json(
      { error: "Debes autorizar el tratamiento de datos para enviar la solicitud" },
      { status: 400 }
    )
  }

  // Validar campos requeridos del arrendatario
  if (
    typeof propiedad_id !== "string" ||
    typeof nombre !== "string" ||
    typeof email !== "string" ||
    typeof cedula !== "string"
  ) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: propiedad_id, nombre, email, cedula" },
      { status: 400 }
    )
  }

  const nombreTrim = nombre.trim()
  const emailTrim = email.trim().toLowerCase()
  const cedulaTrim = cedula.trim()
  const propiedadIdTrim = propiedad_id.trim()

  if (!nombreTrim || !emailTrim || !cedulaTrim || !propiedadIdTrim) {
    return NextResponse.json(
      { error: "nombre, email, cedula y propiedad_id no pueden estar vacíos" },
      { status: 400 }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailTrim)) {
    return NextResponse.json({ error: "Formato de correo electrónico inválido" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar que la propiedad existe y está disponible — traer campos para notificaciones
  const { data: propiedad, error: errProp } = await admin
    .from("propiedades")
    .select("id, estado, user_id, ciudad, area, valor_arriendo")
    .eq("id", propiedadIdTrim)
    .single()

  if (errProp || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  if (propiedad.estado !== "disponible") {
    return NextResponse.json(
      { error: "La propiedad no está disponible para aplicar" },
      { status: 400 }
    )
  }

  const toNullableText = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null
  const toNullableInt = (v: unknown) => {
    if (typeof v === "number") return v
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseInt(v, 10)
      return isNaN(n) ? null : n
    }
    return null
  }
  const toNullableNum = (v: unknown) => {
    if (typeof v === "number") return v
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseFloat(v.replace(/[^0-9.]/g, ""))
      return isNaN(n) ? null : n
    }
    return null
  }

  const { data: inserted, error: errInsert } = await admin
    .from("arrenlex_form_intake")
    .insert({
      propiedad_id: propiedadIdTrim,
      nombre: nombreTrim,
      email: emailTrim,
      cedula: cedulaTrim,
      fecha_expedicion_cedula: toNullableText(fecha_expedicion_cedula),
      telefono: toNullableText(telefono),
      empresa_arrendatario: toNullableText(empresa_arrendatario),
      antiguedad_meses: toNullableInt(antiguedad_meses),
      salario: toNullableNum(salario),
      ingresos: toNullableNum(ingresos),
      nombre_coarrendatario: toNullableText(nombre_coarrendatario),
      cedula_coarrendatario: toNullableText(cedula_coarrendatario),
      fecha_expedicion_cedula_coarrendatario: toNullableText(fecha_expedicion_cedula_coarrendatario),
      empresa_coarrendatario: toNullableText(empresa_coarrendatario),
      antiguedad_meses_2: toNullableInt(antiguedad_meses_2),
      salario_2: toNullableNum(salario_2),
      telefono_coarrendatario: toNullableText(telefono_coarrendatario),
      personas: toNullableInt(personas),
      ninos: toNullableInt(ninos),
      mascotas: toNullableInt(mascotas),
      personas_trabajan: toNullableInt(personas_trabajan),
      negocio: toNullableText(negocio),
      autorizacion: "Si",
      fecha_envio: new Date().toISOString(),
      gestionado: false,
    })
    .select("id")
    .single()

  if (errInsert) {
    console.error("[intake/aplicacion POST]", errInsert)
    return NextResponse.json({ error: "Error al guardar la solicitud" }, { status: 500 })
  }

  // ── Notificaciones post-INSERT (no bloquean la respuesta) ─────────────────

  const propiedadRef = [propiedad.ciudad, propiedad.area ? `${propiedad.area} m²` : null]
    .filter(Boolean)
    .join(" · ") || propiedadIdTrim

  // Obtener email y nombre del propietario
  let propietarioEmail: string | undefined
  let propietarioNombre: string | undefined

  try {
    const { data: authUser, error: errAuth } = await admin.auth.admin.getUserById(propiedad.user_id)
    if (!errAuth && authUser) {
      propietarioEmail = authUser.user.email
      const { data: perfil } = await admin
        .from("perfiles")
        .select("nombre")
        .eq("id", propiedad.user_id)
        .maybeSingle()
      propietarioNombre = perfil?.nombre ?? authUser.user.user_metadata?.nombre ?? undefined
    }
  } catch (err) {
    console.warn("[intake/aplicacion] No se pudo obtener datos del propietario:", err)
  }

  // Enviar correos (CEO + propietario)
  sendAplicacionEmail({
    propiedadId: propiedadIdTrim,
    propiedadRef,
    canonArriendo: propiedad.valor_arriendo ?? null,
    nombre: nombreTrim,
    email: emailTrim,
    cedula: cedulaTrim,
    fechaExpedicionCedula: toNullableText(fecha_expedicion_cedula),
    telefono: toNullableText(telefono),
    empresaArrendatario: toNullableText(empresa_arrendatario),
    antiguedadMeses: toNullableInt(antiguedad_meses),
    salario: toNullableNum(salario),
    ingresos: toNullableNum(ingresos),
    nombreCoarrendatario: toNullableText(nombre_coarrendatario),
    cedulaCoarrendatario: toNullableText(cedula_coarrendatario),
    fechaExpedicionCedulaCoarrendatario: toNullableText(fecha_expedicion_cedula_coarrendatario),
    empresaCoarrendatario: toNullableText(empresa_coarrendatario),
    antiguedadMeses2: toNullableInt(antiguedad_meses_2),
    salario2: toNullableNum(salario_2),
    telefonoCoarrendatario: toNullableText(telefono_coarrendatario),
    personas: toNullableInt(personas),
    ninos: toNullableInt(ninos),
    mascotas: toNullableInt(mascotas),
    personasTrabajan: toNullableInt(personas_trabajan),
    negocio: toNullableText(negocio),
    propietarioEmail,
    propietarioNombre,
  }).catch((err) => console.error("[intake/aplicacion] Error enviando emails:", err))

  // Enviar WhatsApp al CEO
  sendWhatsAppCEO(
    buildAplicacionWhatsAppText({
      propiedadRef,
      canonArriendo: propiedad.valor_arriendo ?? null,
      nombre: nombreTrim,
      cedula: cedulaTrim,
      telefono: toNullableText(telefono),
      salario: toNullableNum(salario),
      salario2: toNullableNum(salario_2),
      ingresos: toNullableNum(ingresos),
      personas: toNullableInt(personas),
      ninos: toNullableInt(ninos),
      mascotas: toNullableInt(mascotas),
      negocio: toNullableText(negocio),
    })
  ).catch((err) => console.error("[intake/aplicacion] Error enviando WhatsApp:", err))

  return NextResponse.json({ id: inserted?.id, ok: true }, { status: 201 })
}
