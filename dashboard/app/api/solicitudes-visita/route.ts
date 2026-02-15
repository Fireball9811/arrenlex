import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { sendSolicitudVisitaEmail } from "@/lib/email/send-solicitud-visita"

/**
 * GET - Lista solicitudes de visita.
 * Admin: todas. Propietario: solo las de sus propiedades.
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
    return NextResponse.json({ error: "No autorizado para ver mensajes" }, { status: 403 })
  }

  const admin = createAdminClient()

  if (role === "admin") {
    const { data, error } = await admin
      .from("solicitudes_visita")
      .select(
        `
        id,
        nombre_completo,
        celular,
        email,
        status,
        propiedad_id,
        nota,
        created_at,
        propiedades ( id, direccion, ciudad, barrio )
      `
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[solicitudes-visita GET]", error)
      return NextResponse.json({ error: "Error al listar solicitudes" }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  }

  // propietario: solo propiedades donde user_id = user.id
  const { data: propIds } = await admin
    .from("propiedades")
    .select("id")
    .eq("user_id", user.id)

  const ids = (propIds ?? []).map((p) => p.id)
  if (ids.length === 0) {
    return NextResponse.json([])
  }

  const { data, error } = await admin
    .from("solicitudes_visita")
    .select(
      `
      id,
      nombre_completo,
      celular,
      email,
      status,
      propiedad_id,
      nota,
      created_at,
      propiedades ( id, direccion, ciudad, barrio )
    `
    )
    .in("propiedad_id", ids)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[solicitudes-visita GET]", error)
    return NextResponse.json({ error: "Error al listar solicitudes" }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

/**
 * POST - Crea una solicitud de visita (público).
 * Body: nombre_completo, celular, email, propiedad_id, nota (opcional).
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const {
    nombre_completo,
    celular,
    email,
    propiedad_id,
    nota,
  } = body as Record<string, unknown>

  if (
    typeof nombre_completo !== "string" ||
    typeof celular !== "string" ||
    typeof email !== "string" ||
    typeof propiedad_id !== "string"
  ) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: nombre_completo, celular, email, propiedad_id" },
      { status: 400 }
    )
  }

  const nombreTrim = nombre_completo.trim()
  const celularTrim = celular.trim()
  const emailTrim = email.trim().toLowerCase()
  const propiedadIdTrim = propiedad_id.trim()

  if (!nombreTrim || !celularTrim || !emailTrim || !propiedadIdTrim) {
    return NextResponse.json(
      { error: "nombre_completo, celular, email y propiedad_id no pueden estar vacíos" },
      { status: 400 }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailTrim)) {
    return NextResponse.json({ error: "Formato de correo electrónico inválido" }, { status: 400 })
  }

  const notaVal = typeof nota === "string" ? nota.trim() || null : null

  const admin = createAdminClient()

  const { data: propiedad, error: errProp } = await admin
    .from("propiedades")
    .select("id, direccion, ciudad, estado")
    .eq("id", propiedadIdTrim)
    .single()

  if (errProp || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  if (propiedad.estado !== "disponible") {
    return NextResponse.json(
      { error: "La propiedad no está disponible para solicitar visita" },
      { status: 400 }
    )
  }

  const { data: inserted, error: errInsert } = await admin
    .from("solicitudes_visita")
    .insert({
      nombre_completo: nombreTrim,
      celular: celularTrim,
      email: emailTrim,
      propiedad_id: propiedadIdTrim,
      nota: notaVal,
      status: "pendiente",
    })
    .select("id")
    .single()

  if (errInsert) {
    console.error("[solicitudes-visita POST]", errInsert)
    return NextResponse.json({ error: "Error al guardar la solicitud" }, { status: 500 })
  }

  const propiedadRef = [propiedad.direccion, propiedad.ciudad].filter(Boolean).join(", ") || propiedadIdTrim
  const emailResult = await sendSolicitudVisitaEmail({
    nombreCompleto: nombreTrim,
    celular: celularTrim,
    email: emailTrim,
    propiedadId: propiedadIdTrim,
    propiedadRef,
    nota: notaVal,
  })

  if (!emailResult.success) {
    console.error("[solicitudes-visita] Email no enviado:", emailResult.error)
    // La solicitud ya se guardó; no fallamos la petición
  }

  return NextResponse.json({
    id: inserted?.id,
    message: "Solicitud enviada correctamente",
  })
}
