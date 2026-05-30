import { NextResponse } from "next/server"
import { requireAdminOrPropietario } from "@/lib/habeas-data/route-auth"
import { ESTADO_VALUES, ORIGEN_VALUES, TIPO_SOLICITUD_VALUES } from "@/lib/habeas-data/constants"

const TABLE = "arrenlex_habeas_data_requests"

function isValidTipo(v: unknown): v is (typeof TIPO_SOLICITUD_VALUES)[number] {
  return typeof v === "string" && (TIPO_SOLICITUD_VALUES as readonly string[]).includes(v)
}

function isValidEstado(v: unknown): v is (typeof ESTADO_VALUES)[number] {
  return typeof v === "string" && (ESTADO_VALUES as readonly string[]).includes(v)
}

function isValidOrigen(v: unknown): v is (typeof ORIGEN_VALUES)[number] {
  return typeof v === "string" && (ORIGEN_VALUES as readonly string[]).includes(v)
}

function toNullableUuid(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

/**
 * GET — Lista solicitudes Habeas Data (admin y propietario).
 * Query: estado, tipo_solicitud, q (nombre, cédula o email)
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrPropietario()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const estado = searchParams.get("estado")
  const tipo = searchParams.get("tipo_solicitud")
  const q = searchParams.get("q")?.trim()

  let query = auth.ctx.admin.from(TABLE).select("*").order("fecha_recibido", { ascending: false })

  if (estado && isValidEstado(estado)) {
    query = query.eq("estado", estado)
  }
  if (tipo && isValidTipo(tipo)) {
    query = query.eq("tipo_solicitud", tipo)
  }
  if (q && q.length > 0) {
    const esc = q.replace(/%/g, "\\%").replace(/_/g, "\\_")
    query = query.or(`nombre.ilike.%${esc}%,cedula.ilike.%${esc}%,email.ilike.%${esc}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("[habeas-data GET]", error)
    return NextResponse.json({ error: "Error al listar solicitudes" }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

/**
 * POST — Crea una solicitud Habeas Data.
 */
export async function POST(request: Request) {
  const auth = await requireAdminOrPropietario()
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : ""
  const cedula = typeof body.cedula === "string" ? body.cedula.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const tipo_solicitud = body.tipo_solicitud
  const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : ""
  const estado = body.estado

  if (!nombre || !cedula || !email || !descripcion) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
  }
  if (!isValidTipo(tipo_solicitud)) {
    return NextResponse.json({ error: "Tipo de solicitud inválido" }, { status: 400 })
  }
  if (!isValidEstado(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
  }

  const telefono =
    typeof body.telefono === "string" && body.telefono.trim() ? body.telefono.trim() : null
  const rawOrigen = typeof body.origen === "string" && body.origen.trim() ? body.origen.trim() : "correo"
  const origen = isValidOrigen(rawOrigen) ? rawOrigen : "correo"
  const fecha_recibido =
    typeof body.fecha_recibido === "string" && body.fecha_recibido.trim()
      ? body.fecha_recibido.trim()
      : new Date().toISOString()
  const fecha_limite =
    typeof body.fecha_limite_respuesta === "string" && body.fecha_limite_respuesta.trim()
      ? body.fecha_limite_respuesta.trim()
      : null
  const fecha_respuesta =
    typeof body.fecha_respuesta === "string" && body.fecha_respuesta.trim()
      ? body.fecha_respuesta.trim()
      : null
  const respuesta =
    typeof body.respuesta === "string" && body.respuesta.trim() ? body.respuesta.trim() : null
  const relacionado = toNullableUuid(body.relacionado_form_intake_id)

  const insertRow = {
    nombre,
    cedula,
    email,
    telefono,
    tipo_solicitud,
    descripcion,
    estado,
    fecha_recibido,
    fecha_limite_respuesta: fecha_limite,
    fecha_respuesta,
    respuesta,
    origen,
    relacionado_form_intake_id: relacionado,
  }

  const { data, error } = await auth.ctx.admin.from(TABLE).insert(insertRow).select("*").single()

  if (error) {
    console.error("[habeas-data POST]", error)
    return NextResponse.json({ error: "Error al crear solicitud" }, { status: 500 })
  }

  return NextResponse.json(data)
}
