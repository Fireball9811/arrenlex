import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendAplicacionEmail } from "@/lib/email/send-aplicacion"
import { sendWhatsAppCEO, buildAplicacionWhatsAppText } from "@/lib/whatsapp/send-whatsapp"

// Salario mensual mínimo (COP) que aceptamos para una solicitud de
// arrendamiento. El cliente ya valida esto, pero lo replicamos en el servidor
// porque el formulario puede ser saltado (curl, JS deshabilitado, etc.).
const SALARIO_MINIMO = 1_000_000

const AUTORIZACION_VERSION = "2025.01"

const AUTORIZACION_TEXTO =
  "Autorizo de manera expresa a Arrenlex SAS, identificada con NIT 902036870-9, como responsable del tratamiento de datos, y/o a quien esta designe como encargado, para recolectar, almacenar, usar, consultar, actualizar, transmitir y conservar mis datos personales con la finalidad de evaluar mi solicitud de arrendamiento, verificar mi identidad, validar la información suministrada, analizar mi capacidad económica, gestionar comunicaciones relacionadas con el inmueble, preparar documentos contractuales y cumplir obligaciones legales o contractuales. Declaro que la información suministrada es veraz y autorizo su validación únicamente con el propósito de evaluar mi aplicación de arrendamiento. Entiendo que mis datos serán tratados de manera confidencial y conforme a la normativa vigente en materia de protección de datos personales."

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

function normalizeTipoSolicitante(raw: unknown): "arrendatario_principal" | "coarrendatario" {
  if (typeof raw !== "string") return "arrendatario_principal"
  const t = raw.trim().toLowerCase()
  return t === "coarrendatario" ? "coarrendatario" : "arrendatario_principal"
}

function clientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for")
  const first = xff?.split(",")[0]?.trim()
  return first || null
}

/**
 * POST /api/intake/aplicacion
 *
 * Endpoint público (sin auth) que recibe el formulario de aplicación de arrendamiento
 * enviado desde el wizard del catálogo.
 *
 * Valida:
 *  - autorizacion === "Si" y autorizacion_aceptada === true
 *  - propiedad_id existe y está disponible
 *  - campos requeridos del solicitante (una persona por envío)
 *  - salario del solicitante >= SALARIO_MINIMO
 *  - token de invitación válido (un solo uso, 24 h); el tipo de solicitante y el
 *    grupo se toman del registro del token, no del cuerpo de la petición
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
    // Paso 1 — Solicitante
    nombre,
    email,
    cedula,
    fecha_expedicion_cedula,
    telefono,
    // Paso 2 — Laboral
    empresa_arrendatario,
    antiguedad_meses,
    salario,
    ingresos,
    // Hogar y autorización
    personas,
    ninos,
    mascotas,
    personas_trabajan,
    negocio,
    fecha_ingreso_deseada,
    autorizacion,
    autorizacion_aceptada,
  } = body as Record<string, unknown>

  if (autorizacion !== "Si" || autorizacion_aceptada !== true) {
    return NextResponse.json(
      { error: "Debe autorizar el tratamiento de datos personales para enviar la solicitud." },
      { status: 400 }
    )
  }

  // Validar campos requeridos del solicitante
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

  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json(
      { error: "Se requiere un enlace de invitación válido." },
      { status: 400 }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailTrim)) {
    return NextResponse.json({ error: "Formato de correo electrónico inválido" }, { status: 400 })
  }

  const salarioMinFmt = `$${SALARIO_MINIMO.toLocaleString("es-CO")}`
  const salarioNum = toNullableNum(salario)
  if (salarioNum == null || salarioNum < SALARIO_MINIMO) {
    return NextResponse.json(
      {
        error: `El salario mensual debe ser de al menos ${salarioMinFmt}. No se aceptan solicitudes con un valor menor.`,
      },
      { status: 400 }
    )
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

  const { data: td, error: errToken } = await admin
    .from("aplicacion_tokens")
    .select("id, usado, expira_en, propiedad_id, grupo_solicitud_id, tipo_solicitante")
    .eq("token", token.trim())
    .single()

  if (errToken || !td) {
    return NextResponse.json({ error: "Enlace no válido." }, { status: 400 })
  }

  if (td.propiedad_id !== propiedadIdTrim) {
    return NextResponse.json({ error: "El enlace no corresponde a esta propiedad." }, { status: 400 })
  }

  if (td.usado) {
    return NextResponse.json(
      { error: "Este enlace ya fue utilizado. La aplicación ya fue enviada." },
      { status: 400 }
    )
  }

  if (new Date(td.expira_en) < new Date()) {
    return NextResponse.json(
      { error: "Este enlace ha expirado. Solicita un nuevo enlace al arrendador." },
      { status: 400 }
    )
  }

  const tipoSolicitante = normalizeTipoSolicitante(td.tipo_solicitante)
  const enlaceDelPar: 1 | 2 = tipoSolicitante === "coarrendatario" ? 2 : 1
  const grupoSolicitudId =
    typeof td.grupo_solicitud_id === "string" && td.grupo_solicitud_id.trim() !== ""
      ? td.grupo_solicitud_id.trim()
      : randomUUID()

  const tokenRowId = td.id

  // Flujo con dos enlaces: cada quien envía solo sus datos; no hay bandera "único arrendatario".

  const authFecha = new Date().toISOString()
  const userAgent = request.headers.get("user-agent") || null

  const { data: inserted, error: errInsert } = await admin
    .from("arrenlex_form_intake")
    .insert({
      propiedad_id: propiedadIdTrim,
      grupo_solicitud_id: grupoSolicitudId,
      tipo_solicitante: tipoSolicitante,
      nombre: nombreTrim,
      email: emailTrim,
      cedula: cedulaTrim,
      cedula_ciudad_expedicion: toNullableText(fecha_expedicion_cedula),
      telefono: toNullableText(telefono),
      adultos_habitantes: toNullableInt(personas),
      ninos_habitantes: toNullableInt(ninos),
      mascotas_cantidad: toNullableInt(mascotas),
      salario_principal: toNullableNum(salario),
      ingresos: toNullableNum(ingresos),
      empresa_principal: toNullableText(empresa_arrendatario),
      tiempo_servicio_principal_meses: toNullableInt(antiguedad_meses),
      personas_trabajan: toNullableInt(personas_trabajan),
      negocio: toNullableText(negocio),
      fecha_ingreso_deseada: toNullableText(fecha_ingreso_deseada),
      autorizacion: "Si",
      autorizacion_aceptada: true,
      autorizacion_fecha: authFecha,
      autorizacion_version: AUTORIZACION_VERSION,
      autorizacion_texto: AUTORIZACION_TEXTO,
      autorizacion_ip: clientIp(request),
      autorizacion_user_agent: userAgent,
      unico_arrendatario: false,
      fecha_envio: authFecha,
      gestionado: false,
    })
    .select("id")
    .single()

  if (errInsert) {
    console.error("[intake/aplicacion POST]", errInsert)
    return NextResponse.json({ error: "Error al guardar la solicitud" }, { status: 500 })
  }

  await admin
    .from("aplicacion_tokens")
    .update({ usado: true, usado_en: new Date().toISOString(), intake_id: inserted?.id ?? null })
    .eq("id", tokenRowId)

  // ── Notificaciones post-INSERT (no bloquean la respuesta) ─────────────────

  const propiedadRef = [propiedad.ciudad, propiedad.area ? `${propiedad.area} m²` : null]
    .filter(Boolean)
    .join(" · ") || propiedadIdTrim

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
    nombreCoarrendatario: null,
    emailCoarrendatario: null,
    cedulaCoarrendatario: null,
    fechaExpedicionCedulaCoarrendatario: null,
    empresaCoarrendatario: null,
    antiguedadMeses2: null,
    salario2: null,
    telefonoCoarrendatario: null,
    personas: toNullableInt(personas),
    ninos: toNullableInt(ninos),
    mascotas: toNullableInt(mascotas),
    personasTrabajan: toNullableInt(personas_trabajan),
    negocio: toNullableText(negocio),
    unicoArrendatario: false,
    enlaceDelPar,
    propietarioEmail,
    propietarioNombre,
  }).catch((err) => console.error("[intake/aplicacion] Error enviando emails:", err))

  const waResult = await sendWhatsAppCEO(
    buildAplicacionWhatsAppText({
      propiedadRef,
      canonArriendo: propiedad.valor_arriendo ?? null,
      nombre: nombreTrim,
      cedula: cedulaTrim,
      telefono: toNullableText(telefono),
      salario: toNullableNum(salario),
      salario2: null,
      ingresos: toNullableNum(ingresos),
      personas: toNullableInt(personas),
      ninos: toNullableInt(ninos),
      mascotas: toNullableInt(mascotas),
      negocio: toNullableText(negocio),
      unicoArrendatario: false,
      enlaceDelPar,
    })
  ).catch((err) => {
    console.error("[intake/aplicacion] Error enviando WhatsApp:", err)
    return { success: false, error: String(err) }
  })
  console.log("[intake/aplicacion] WhatsApp result:", JSON.stringify(waResult))

  return NextResponse.json(
    { id: inserted?.id, ok: true, grupo_solicitud_id: grupoSolicitudId },
    { status: 201 }
  )
}
