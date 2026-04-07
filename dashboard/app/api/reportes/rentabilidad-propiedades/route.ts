import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { handleSupabaseError } from "@/lib/api-error"

/**
 * GET /api/reportes/rentabilidad-propiedades
 *
 * Devuelve TODAS las propiedades con ingresos (recibos_pago + pagos completados)
 * y gastos (mantenimiento_gestiones) en el rango de fechas.
 * Incluye detalle de gestiones por propiedad.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const fechaInicio = searchParams.get("fecha_inicio")
    ?? `${new Date().getFullYear()}-01-01`
  const fechaFin = searchParams.get("fecha_fin")
    ?? new Date().toISOString().split("T")[0]

  const admin = createAdminClient()

  // ── 1. TODAS las propiedades del usuario ─────────────────────────────────────
  let propsQuery = admin
    .from("propiedades")
    .select("id, direccion, ciudad, barrio, valor_arriendo, estado")
    .order("direccion", { ascending: true })

  if (role === "propietario") {
    propsQuery = propsQuery.eq("user_id", user.id)
  }

  const { data: todasProps, error: errProps } = await propsQuery
  if (errProps) return handleSupabaseError("rentabilidad propiedades", errProps)
  if (!todasProps?.length) {
    return NextResponse.json({
      propiedades: [],
      consolidado: { ingresos: 0, gastos: 0, neto: 0 },
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    })
  }

  const todosIds = todasProps.map((p) => p.id)

  // ── 2. Ingresos desde recibos_pago ───────────────────────────────────────────
  const { data: recibos, error: errRecibos } = await admin
    .from("recibos_pago")
    .select("propiedad_id, valor_arriendo, fecha_recibo, estado")
    .in("propiedad_id", todosIds)
    .gte("fecha_recibo", fechaInicio)
    .lte("fecha_recibo", fechaFin)

  if (errRecibos) return handleSupabaseError("rentabilidad recibos", errRecibos)

  // Propiedades que ya tienen recibos (para no doble contar con pagos)
  const propsConRecibos = new Set((recibos ?? []).map((r) => r.propiedad_id))

  // ── 3. Ingresos fallback desde pagos completados ─────────────────────────────
  const { data: pagosRaw } = await admin
    .from("pagos")
    .select("monto, fecha_pago, contrato_id")
    .eq("estado", "completado")
    .gte("fecha_pago", fechaInicio)
    .lte("fecha_pago", fechaFin)

  // Resolver propiedad_id desde contratos para los pagos
  let pagosConPropiedad: Array<{ propiedad_id: string; monto: number; fecha_pago: string }> = []
  if (pagosRaw?.length) {
    const contratoIds = [...new Set(pagosRaw.map((p) => p.contrato_id).filter(Boolean))]
    if (contratoIds.length > 0) {
      const { data: contratos } = await admin
        .from("contratos")
        .select("id, propiedad_id")
        .in("id", contratoIds)

      const contratoMap = new Map((contratos ?? []).map((c) => [c.id, c.propiedad_id]))

      pagosConPropiedad = pagosRaw
        .map((p) => ({
          propiedad_id: contratoMap.get(p.contrato_id) ?? "",
          monto: Number(p.monto ?? 0),
          fecha_pago: p.fecha_pago ?? "",
        }))
        .filter((p) => p.propiedad_id && todosIds.includes(p.propiedad_id))
    }
  }

  // ── 4. Gastos: gestiones de mantenimiento ────────────────────────────────────
  // Primero obtenemos las solicitudes de las propiedades del usuario
  const { data: solicitudes } = await admin
    .from("solicitudes_mantenimiento")
    .select("id, propiedad_id, detalle, nombre_completo, status")
    .in("propiedad_id", todosIds)

  const solicitudMap = new Map(
    (solicitudes ?? []).map((s) => [s.id, s])
  )
  const solicitudIds = (solicitudes ?? []).map((s) => s.id)

  // Luego las gestiones de esas solicitudes en el rango de fechas
  let gestionesData: Array<{
    id: string
    solicitud_id: string
    descripcion: string
    proveedor: string | null
    costo: number
    fecha_ejecucion: string
  }> = []

  if (solicitudIds.length > 0) {
    const { data: gestiones, error: errGestiones } = await admin
      .from("mantenimiento_gestiones")
      .select("id, solicitud_id, descripcion, proveedor, costo, fecha_ejecucion")
      .in("solicitud_id", solicitudIds)
      .gte("fecha_ejecucion", fechaInicio)
      .lte("fecha_ejecucion", fechaFin)
      .order("fecha_ejecucion", { ascending: true })

    if (errGestiones) return handleSupabaseError("rentabilidad gestiones", errGestiones)
    gestionesData = (gestiones ?? []).map((g) => ({
      ...g,
      costo: Number(g.costo ?? 0),
    }))
  }

  // ── 5. Construir mapa de propiedades ─────────────────────────────────────────
  type GestionItem = {
    id: string
    solicitud_id: string
    solicitud_detalle: string
    descripcion: string
    proveedor: string | null
    costo: number
    fecha_ejecucion: string
  }

  type PropEntry = {
    direccion: string
    ciudad: string
    estado: string
    valor_arriendo_mensual: number
    ingresos: number
    gastos: number
    gestiones_detalle: GestionItem[]
  }

  const mapa = new Map<string, PropEntry>()
  for (const p of todasProps) {
    mapa.set(p.id, {
      direccion: p.direccion ?? "",
      ciudad: p.ciudad ?? "",
      estado: p.estado ?? "",
      valor_arriendo_mensual: Number(p.valor_arriendo ?? 0),
      ingresos: 0,
      gastos: 0,
      gestiones_detalle: [],
    })
  }

  // Sumar ingresos de recibos
  for (const r of recibos ?? []) {
    const e = mapa.get(r.propiedad_id)
    if (e) e.ingresos += Number(r.valor_arriendo ?? 0)
  }

  // Sumar ingresos de pagos (solo si no hay recibos para esa propiedad)
  for (const p of pagosConPropiedad) {
    if (propsConRecibos.has(p.propiedad_id)) continue
    const e = mapa.get(p.propiedad_id)
    if (e) e.ingresos += p.monto
  }

  // Sumar gastos de gestiones y guardar detalle
  for (const g of gestionesData) {
    const sol = solicitudMap.get(g.solicitud_id)
    if (!sol) continue
    const e = mapa.get(sol.propiedad_id)
    if (!e) continue
    e.gastos += g.costo
    e.gestiones_detalle.push({
      id: g.id,
      solicitud_id: g.solicitud_id,
      solicitud_detalle: sol.detalle ?? "",
      descripcion: g.descripcion,
      proveedor: g.proveedor,
      costo: g.costo,
      fecha_ejecucion: g.fecha_ejecucion,
    })
  }

  // ── 6. Resultado final ───────────────────────────────────────────────────────
  const propiedades = Array.from(mapa.entries())
    .map(([id, v]) => ({
      propiedad_id: id,
      direccion: v.direccion,
      ciudad: v.ciudad,
      estado: v.estado,
      valor_arriendo_mensual: v.valor_arriendo_mensual,
      ingresos: v.ingresos,
      gastos: v.gastos,
      neto: v.ingresos - v.gastos,
      gestiones_detalle: v.gestiones_detalle,
    }))
    .sort((a, b) => a.direccion.localeCompare(b.direccion))

  const consolidado = propiedades.reduce(
    (acc, p) => ({
      ingresos: acc.ingresos + p.ingresos,
      gastos: acc.gastos + p.gastos,
      neto: acc.neto + p.neto,
    }),
    { ingresos: 0, gastos: 0, neto: 0 }
  )

  return NextResponse.json({
    propiedades,
    consolidado,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
  })
}
