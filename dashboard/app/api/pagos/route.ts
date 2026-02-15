import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Lista pagos. Admin: todos. Propietario: solo los de sus contratos.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const client = role === "admin" ? createAdminClient() : supabase

  const { data, error } = await client
    .from("pagos")
    .select(
      `
      id,
      contrato_id,
      monto,
      periodo,
      metodo_pago,
      referencia_bancaria,
      estado,
      fecha_pago,
      fecha_aprobacion,
      created_at,
      contrato:contratos(
        propiedad_id,
        arrendatario_id,
        propiedad:propiedades(direccion),
        arrendatario:arrendatarios(nombre),
        user_id
      )
    `
    )
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Normalizar: Supabase puede devolver relaciones anidadas como array u objeto
  type RawRow = {
    id: string
    contrato_id: string
    monto: number
    periodo: string
    metodo_pago: string
    referencia_bancaria: string | null
    estado: string
    fecha_pago: string | null
    fecha_aprobacion: string | null
    created_at: string
    contrato: unknown
  }
  const raw = (data ?? []) as RawRow[]

  const normalizeContrato = (c: unknown): {
    propiedad_id: string
    arrendatario_id: string
    user_id: string
    propiedad: { direccion?: string } | null
    arrendatario: { nombre?: string } | null
  } | null => {
    if (!c || typeof c !== "object") return null
    const obj = Array.isArray(c) ? c[0] : c
    if (!obj || typeof obj !== "object") return null
    const co = obj as Record<string, unknown>
    const prop = co.propiedad
    const arr = co.arrendatario
    return {
      propiedad_id: String(co.propiedad_id ?? ""),
      arrendatario_id: String(co.arrendatario_id ?? ""),
      user_id: String(co.user_id ?? ""),
      propiedad: prop
        ? { direccion: String((Array.isArray(prop) ? prop[0] : prop)?.direccion ?? "") }
        : null,
      arrendatario: arr
        ? { nombre: String((Array.isArray(arr) ? arr[0] : arr)?.nombre ?? "") }
        : null,
    }
  }

  const normalized = raw.map((p) => ({ ...p, contrato: normalizeContrato(p.contrato) }))

  const userIds = [...new Set(normalized.map((p) => p.contrato?.user_id).filter(Boolean) as string[])]
  const perfilesRes =
    userIds.length > 0
      ? await client.from("perfiles").select("id, nombre").in("id", userIds)
      : { data: [] as Array<{ id: string; nombre: string | null }> }
  const perfilesMap = new Map(
    (perfilesRes.data ?? []).map((p) => [p.id, p.nombre ?? "Propietario"])
  )

  const pagos = normalized.map((p) => {
    const c = p.contrato
    return {
      id: p.id,
      contrato_id: p.contrato_id,
      inquilino: c?.arrendatario?.nombre ?? "",
      propietario: c?.user_id ? perfilesMap.get(c.user_id) ?? "" : "",
      direccion: c?.propiedad?.direccion ?? "",
      monto: Number(p.monto),
      periodo: p.periodo,
      metodo: p.metodo_pago,
      referencia: p.referencia_bancaria ?? "",
      estado: p.estado === "completado" ? "Completado" : p.estado === "pendiente" ? "Pendiente" : "Rechazado",
      fecha_pago: p.fecha_pago ?? "",
      fecha_aprobacion: p.fecha_aprobacion ?? "-",
    }
  })

  return NextResponse.json(pagos)
}

/**
 * POST - Crear un pago. contrato_id, monto, periodo, metodo_pago, referencia_bancaria (texto completo, letras y números).
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
  if (role !== "propietario") {
    return NextResponse.json(
      {
        error:
          "Como administrador tu rol no te permite registrar pagos. Solo los propietarios pueden registrar pagos de sus propiedades.",
      },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { contrato_id, monto, periodo, metodo_pago, referencia_bancaria } = body

  if (!contrato_id || monto == null || !periodo || !metodo_pago) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: contrato_id, monto, periodo, metodo_pago" },
      { status: 400 }
    )
  }

  const montoNum = Number(monto)
  if (Number.isNaN(montoNum) || montoNum <= 0) {
    return NextResponse.json({ error: "Monto debe ser un número positivo" }, { status: 400 })
  }

  const periodoStr = String(periodo).trim()
  if (!periodoStr) {
    return NextResponse.json({ error: "Periodo es requerido" }, { status: 400 })
  }

  const referencia = referencia_bancaria != null ? String(referencia_bancaria).trim() : ""

  const insert = {
    contrato_id,
    monto: montoNum,
    periodo: periodoStr,
    metodo_pago: String(metodo_pago),
    referencia_bancaria: referencia || null,
    estado: "pendiente",
    fecha_pago: new Date().toISOString().slice(0, 10),
  }

  const { data, error } = await supabase.from("pagos").insert(insert).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
