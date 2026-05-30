import { NextResponse } from "next/server"
import { requireAdminOrPropietario } from "@/lib/habeas-data/route-auth"
import { ESTADO_VALUES, ORIGEN_VALUES, TIPO_SOLICITUD_VALUES } from "@/lib/habeas-data/constants"
import { canReadIntakeRow, getPropietarioPropiedadIds } from "@/lib/habeas-data/intake-access"

const TABLE = "arrenlex_habeas_data_requests"

const INTAKE_SELECT =
  "nombre, email, cedula, tipo_solicitante, grupo_solicitud_id, autorizacion_aceptada, autorizacion_fecha, autorizacion_version, propiedad_id"

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

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET — Detalle + solicitud de arrendamiento relacionada (campos limitados).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminOrPropietario()
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  }

  const { data: row, error } = await auth.ctx.admin.from(TABLE).select("*").eq("id", id).maybeSingle()

  if (error) {
    console.error("[habeas-data GET id]", error)
    return NextResponse.json({ error: "Error al cargar" }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  let intake: Record<string, unknown> | null = null
  const relacionado = row.relacionado_form_intake_id as string | null
  if (relacionado) {
    const { data: intakeRow, error: intakeErr } = await auth.ctx.admin
      .from("arrenlex_form_intake")
      .select(INTAKE_SELECT)
      .eq("id", relacionado)
      .maybeSingle()

    if (!intakeErr && intakeRow) {
      const propIds =
        auth.ctx.role === "propietario"
          ? await getPropietarioPropiedadIds(auth.ctx.admin, auth.ctx.userId)
          : []
      if (canReadIntakeRow(auth.ctx.role, intakeRow as { propiedad_id: string | null }, propIds)) {
        const { propiedad_id: _p, ...rest } = intakeRow as Record<string, unknown>
        intake = rest
      }
    }
  }

  return NextResponse.json({ ...row, intake_relacionado: intake })
}

/**
 * PATCH — Actualiza campos editables; si estado pasa a respondido sin fecha_respuesta, se asigna now().
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminOrPropietario()
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  }

  const { data: existing, error: exErr } = await auth.ctx.admin.from(TABLE).select("*").eq("id", id).maybeSingle()
  if (exErr || !existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}

  if ("tipo_solicitud" in body) {
    if (!isValidTipo(body.tipo_solicitud)) {
      return NextResponse.json({ error: "Tipo de solicitud inválido" }, { status: 400 })
    }
    patch.tipo_solicitud = body.tipo_solicitud
  }
  if ("descripcion" in body) {
    if (typeof body.descripcion !== "string" || !body.descripcion.trim()) {
      return NextResponse.json({ error: "Descripción inválida" }, { status: 400 })
    }
    patch.descripcion = body.descripcion.trim()
  }
  if ("estado" in body) {
    if (!isValidEstado(body.estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }
    patch.estado = body.estado
  }
  if ("fecha_limite_respuesta" in body) {
    const v = body.fecha_limite_respuesta
    patch.fecha_limite_respuesta =
      v === null || v === "" ? null : typeof v === "string" ? v.trim() || null : null
  }
  if ("fecha_respuesta" in body) {
    const v = body.fecha_respuesta
    patch.fecha_respuesta = v === null || v === "" ? null : typeof v === "string" ? v.trim() || null : null
  }
  if ("respuesta" in body) {
    const v = body.respuesta
    patch.respuesta = v === null || v === "" ? null : typeof v === "string" ? v.trim() || null : null
  }
  if ("origen" in body) {
    const raw = typeof body.origen === "string" && body.origen.trim() ? body.origen.trim() : "correo"
    patch.origen = isValidOrigen(raw) ? raw : "correo"
  }
  if ("relacionado_form_intake_id" in body) {
    patch.relacionado_form_intake_id = toNullableUuid(body.relacionado_form_intake_id)
  }

  const nextEstado = (patch.estado as string | undefined) ?? (existing.estado as string)
  const nextFechaRespuesta =
    patch.fecha_respuesta !== undefined
      ? patch.fecha_respuesta
      : (existing.fecha_respuesta as string | null)

  if (nextEstado === "respondido" && !nextFechaRespuesta) {
    patch.fecha_respuesta = new Date().toISOString()
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 })
  }

  const { data, error } = await auth.ctx.admin.from(TABLE).update(patch).eq("id", id).select("*").single()

  if (error) {
    console.error("[habeas-data PATCH]", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }

  return NextResponse.json(data)
}
