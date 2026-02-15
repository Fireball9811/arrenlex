import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

export interface ContratoParaPago {
  contrato_id: string
  propiedad_id: string
  direccion: string
  canon_mensual: number
  propietario_nombre: string | null
  ultimo_periodo: string | null
}

export interface InquilinoConPropiedades {
  arrendatario_id: string
  nombre: string
  contratos: ContratoParaPago[]
}

/**
 * GET - Lista arrendatarios (inquilinos) con sus contratos activos y datos para el formulario de pago.
 * Admin: ve todos los contratos activos.
 * Propietario: solo sus contratos (user_id = auth.uid()).
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
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Sin permiso para esta sección" }, { status: 403 })
  }

  const client = role === "admin" ? createAdminClient() : supabase

  const { data: contratos, error: errContratos } = await client
    .from("contratos")
    .select(`
      id,
      user_id,
      propiedad_id,
      arrendatario_id,
      canon_mensual,
      propiedad:propiedades(id, direccion, valor_arriendo),
      arrendatario:arrendatarios(id, nombre)
    `)
    .eq("estado", "activo")
    .order("created_at", { ascending: false });

  if (errContratos) {
    return NextResponse.json({ error: errContratos.message }, { status: 500 })
  }

  return buildResponse(client, contratos ?? [], user.id)
}

async function buildResponse(
  client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
  contratos: Array<{
    id: string
    user_id: string
    propiedad_id: string
    arrendatario_id: string
    canon_mensual: number
    propiedad: { id: string; direccion: string; valor_arriendo?: number } | null
    arrendatario: { id: string; nombre: string } | null
  }>,
  _currentUserId: string
) {
  const contratoIds = contratos.map((c) => c.id)
  const userIds = [...new Set(contratos.map((c) => c.user_id))]

  const [perfilesRes, pagosRes] = await Promise.all([
    userIds.length > 0
      ? client.from("perfiles").select("id, nombre").in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nombre: string | null }>, error: null }),
    contratoIds.length > 0
      ? client.from("pagos").select("contrato_id, periodo").in("contrato_id", contratoIds)
      : Promise.resolve({ data: [] as Array<{ contrato_id: string; periodo: string }>, error: null }),
  ])

  const perfiles = (perfilesRes.data ?? []) as Array<{ id: string; nombre: string | null }>
  const pagos = (pagosRes.data ?? []) as Array<{ contrato_id: string; periodo: string }>

  const perfilesMap = new Map(perfiles.map((p) => [p.id, p.nombre ?? "Propietario"]))
  const ultimoPeriodoMap = new Map<string, string>()
  pagos
    .sort((a, b) => (b.periodo > a.periodo ? 1 : -1))
    .forEach((p) => {
      if (!ultimoPeriodoMap.has(p.contrato_id)) ultimoPeriodoMap.set(p.contrato_id, p.periodo)
    })

  const contratosParaPago: ContratoParaPago[] = contratos.map((c) => {
    const prop = c.propiedad
    const arr = c.arrendatario
    return {
      contrato_id: c.id,
      propiedad_id: c.propiedad_id,
      direccion: prop?.direccion ?? "",
      canon_mensual: Number(c.canon_mensual) ?? (prop?.valor_arriendo ? Number(prop.valor_arriendo) : 0),
      propietario_nombre: perfilesMap.get(c.user_id) ?? null,
      ultimo_periodo: ultimoPeriodoMap.get(c.id) ?? null,
    }
  })

  const byArrendatario = new Map<string, InquilinoConPropiedades>()
  contratos.forEach((c) => {
    const arr = c.arrendatario
    if (!arr) return
    const entry = contratosParaPago.find((x) => x.contrato_id === c.id)
    if (!entry) return
    if (!byArrendatario.has(arr.id)) {
      byArrendatario.set(arr.id, { arrendatario_id: arr.id, nombre: arr.nombre, contratos: [] })
    }
    byArrendatario.get(arr.id)!.contratos.push(entry)
  })

  const list: InquilinoConPropiedades[] = Array.from(byArrendatario.values())
  return NextResponse.json(list)
}
