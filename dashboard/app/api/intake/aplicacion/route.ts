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
    token,
    // Paso 1 — Arrendatario
    nombre,
    email,
    cedula,
    fecha_expedicion_cedula,
    telefono,
    unico_arrendatario,
    // Paso 2 — Laboral arrendatario
    empresa_arrendatario,
    antiguedad_meses,
    salario,
    ingresos,
    // Paso 3 — Coarrendatario (todos opcionales cuando unico_arrendatario === true)
    nombre_coarrendatario,
    email_coarrendatario,
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

  const esUnicoArrendatario = unico_arrendatario === true

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

  // Validaciones específicas del coarrendatario cuando NO es único arrendatario
  const cedulaCoarrendatarioTrim =
    typeof cedula_coarrendatario === "string" ? cedula_coarrendatario.trim() : ""
  const emailCoarrendatarioTrim =
    typeof email_coarrendatario === "string" ? email_coarrendatario.trim().toLowerCase() : ""

  if (!esUnicoArrendatario) {
    if (cedulaCoarrendatarioTrim && cedulaCoarrendatarioTrim === cedulaTrim) {
      return NextResponse.json(
        { error: "La cédula del coarrendatario no puede ser la misma que la del arrendatario principal" },
        { status: 400 }
      )
    }

    if (emailCoarrendatarioTrim && !emailRegex.test(emailCoarrendatarioTrim)) {
      return NextResponse.json(
        { error: "Formato de correo electrónico del coarrendatario inválido" },
        { status: 400 }
      )
    }
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

  // Validar token de un solo uso — requerido y debe estar vigente
  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json(
      { error: "Se requiere un enlace de invitación válido." },
      { status: 400 }
    )
  }

  const { data: tokenData, error: errToken } = await admin
    .from("aplicacion_tokens")
    .select("id, usado, expira_en, propiedad_id")
    .eq("token", token.trim())
    .single()

  if (errToken || !tokenData) {
    return NextResponse.json({ error: "Enlace no válido." }, { status: 400 })
  }

  if (tokenData.propiedad_id !== propiedadIdTrim) {
    return NextResponse.json({ error: "El enlace no corresponde a esta propiedad." }, { status: 400 })
  }

  if (tokenData.usado) {
    return NextResponse.json(
      { error: "Este enlace ya fue utilizado. La aplicación ya fue enviada." },
      { status: 400 }
    )
  }

  if (new Date(tokenData.expira_en) < new Date()) {
    return NextResponse.json(
      { error: "Este enlace ha expirado. Solicita un nuevo enlace al arrendador." },
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

  // Si el aplicante es único arrendatario, forzar a null todos los campos del coarrendatario
  const coarrendatarioPayload = esUnicoArrendatario
    ? {
        coarrendatario_nombre: null,
        coarrendatario_email: null,
        coarrendatario_cedula: null,
        coarrendatario_cedula_expedicion: null,
        empresa_secundaria: null,
        tiempo_servicio_secundario_meses: null,
        salario_secundario: null,
        coarrendatario_telefono: null,
      }
    : {
        coarrendatario_nombre: toNullableText(nombre_coarrendatario),
        coarrendatario_email: emailCoarrendatarioTrim || null,
        coarrendatario_cedula: toNullableText(cedula_coarrendatario),
        coarrendatario_cedula_expedicion: toNullableText(fecha_expedicion_cedula_coarrendatario),
        empresa_secundaria: toNullableText(empresa_coarrendatario),
        tiempo_servicio_secundario_meses: toNullableInt(antiguedad_meses_2),
        salario_secundario: toNullableNum(salario_2),
        coarrendatario_telefono: toNullableText(telefono_coarrendatario),
      }

  const { data: inserted, error: errInsert } = await admin
    .from("arrenlex_form_intake")
    .insert({
      propiedad_id: propiedadIdTrim,
      nombre: nombreTrim,
      email: emailTrim,
      cedula: cedulaTrim,
      // Nuevos nombres de columnas (unificados con arrendatarios)
      cedula_ciudad_expedicion: toNullableText(fecha_expedicion_cedula),
      telefono: toNullableText(telefono),
      adultos_habitantes: toNullableInt(personas),
      ninos_habitantes: toNullableInt(ninos),
      mascotas_cantidad: toNullableInt(mascotas),
      salario_principal: toNullableNum(salario),
      ingresos: toNullableNum(ingresos),
      empresa_principal: toNullableText(empresa_arrendatario),
      tiempo_servicio_principal_meses: toNullableInt(antiguedad_meses),
      ...coarrendatarioPayload,
      personas_trabajan: toNullableInt(personas_trabajan),
      negocio: toNullableText(negocio),
      autorizacion: "Si",
      unico_arrendatario: esUnicoArrendatario,
      fecha_envio: new Date().toISOString(),
      gestionado: false,
    })
    .select("id")
    .single()

  if (errInsert) {
    console.error("[intake/aplicacion POST]", errInsert)
    return NextResponse.json({ error: "Error al guardar la solicitud" }, { status: 500 })
  }

  // Marcar token como usado
  await admin
    .from("aplicacion_tokens")
    .update({ usado: true, usado_en: new Date().toISOString(), intake_id: inserted?.id ?? null })
    .eq("id", tokenData.id)

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
    nombreCoarrendatario: esUnicoArrendatario ? null : toNullableText(nombre_coarrendatario),
    emailCoarrendatario: esUnicoArrendatario ? null : (emailCoarrendatarioTrim || null),
    cedulaCoarrendatario: esUnicoArrendatario ? null : toNullableText(cedula_coarrendatario),
    fechaExpedicionCedulaCoarrendatario: esUnicoArrendatario ? null : toNullableText(fecha_expedicion_cedula_coarrendatario),
    empresaCoarrendatario: esUnicoArrendatario ? null : toNullableText(empresa_coarrendatario),
    antiguedadMeses2: esUnicoArrendatario ? null : toNullableInt(antiguedad_meses_2),
    salario2: esUnicoArrendatario ? null : toNullableNum(salario_2),
    telefonoCoarrendatario: esUnicoArrendatario ? null : toNullableText(telefono_coarrendatario),
    personas: toNullableInt(personas),
    ninos: toNullableInt(ninos),
    mascotas: toNullableInt(mascotas),
    personasTrabajan: toNullableInt(personas_trabajan),
    negocio: toNullableText(negocio),
    unicoArrendatario: esUnicoArrendatario,
    propietarioEmail,
    propietarioNombre,
  }).catch((err) => console.error("[intake/aplicacion] Error enviando emails:", err))

  // Enviar WhatsApp al CEO
  const waResult = await sendWhatsAppCEO(
    buildAplicacionWhatsAppText({
      propiedadRef,
      canonArriendo: propiedad.valor_arriendo ?? null,
      nombre: nombreTrim,
      cedula: cedulaTrim,
      telefono: toNullableText(telefono),
      salario: toNullableNum(salario),
      salario2: esUnicoArrendatario ? null : toNullableNum(salario_2),
      ingresos: toNullableNum(ingresos),
      personas: toNullableInt(personas),
      ninos: toNullableInt(ninos),
      mascotas: toNullableInt(mascotas),
      negocio: toNullableText(negocio),
      unicoArrendatario: esUnicoArrendatario,
    })
  ).catch((err) => {
    console.error("[intake/aplicacion] Error enviando WhatsApp:", err)
    return { success: false, error: String(err) }
  })
  console.log("[intake/aplicacion] WhatsApp result:", JSON.stringify(waResult))

  return NextResponse.json({ id: inserted?.id, ok: true }, { status: 201 })
}