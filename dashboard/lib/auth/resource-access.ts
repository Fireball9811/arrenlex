import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { UserRole } from "@/lib/auth/role"

export type ArrendatarioBusqueda = {
  id: string
  email: string | null
  nombre: string | null
  cedula: string | null
}

type ContratoRow = {
  id: string
  user_id: string
  propiedad_id?: string
  arrendatario_id?: string
}

/**
 * Verifica acceso a una propiedad. Admin: cualquiera. Propietario: solo user_id = suyo.
 * Devuelve NextResponse si debe cortar la petición; null si puede continuar.
 */
export async function assertPropiedadAccess(
  admin: SupabaseClient,
  role: UserRole,
  userId: string,
  propiedadId: string,
  select = "id, user_id"
): Promise<NextResponse | null> {
  const { data: propiedad, error } = await admin
    .from("propiedades")
    .select(select)
    .eq("id", propiedadId)
    .maybeSingle()

  if (error || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  const row = propiedad as { user_id?: string }
  if (role === "propietario" && row.user_id !== userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  return null
}

/**
 * Carga contrato y valida ownership para propietario.
 */
export async function loadContratoWithAccess(
  admin: SupabaseClient,
  role: UserRole,
  userId: string,
  contratoId: string,
  select = "id, user_id, propiedad_id"
): Promise<{ contrato: ContratoRow } | { response: NextResponse }> {
  const { data: contrato, error } = await admin
    .from("contratos")
    .select(select)
    .eq("id", contratoId)
    .maybeSingle()

  if (error || !contrato) {
    return { response: NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 }) }
  }

  const row = contrato as unknown as ContratoRow

  if (role !== "admin" && role !== "propietario") {
    return { response: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) }
  }

  if (role === "propietario" && row.user_id !== userId) {
    return { response: NextResponse.json({ error: "Sin permiso sobre este contrato" }, { status: 403 }) }
  }

  return { contrato: row }
}

/**
 * Arrendatarios vinculados a contratos del propietario (deduplicados).
 */
export async function arrendatariosDelPropietario(
  admin: SupabaseClient,
  propietarioId: string
): Promise<ArrendatarioBusqueda[]> {
  const { data: contratos, error } = await admin
    .from("contratos")
    .select(
      `
      arrendatario_id,
      arrendatarios (
        id,
        email,
        nombre,
        cedula
      )
    `
    )
    .eq("user_id", propietarioId)

  if (error || !contratos?.length) return []

  const map = new Map<string, ArrendatarioBusqueda>()
  for (const row of contratos) {
    const raw = row.arrendatarios as ArrendatarioBusqueda | ArrendatarioBusqueda[] | null
    const ar = raw == null ? null : Array.isArray(raw) ? raw[0] : raw
    if (ar?.id) map.set(ar.id, ar)
  }
  return [...map.values()]
}

/**
 * Admin: búsqueda global. Propietario: solo arrendatarios de sus contratos.
 */
export async function buscarArrendatarioEnScope(
  admin: SupabaseClient,
  role: UserRole,
  requesterId: string,
  opts: { nombre?: string | null; cedula?: string | null }
): Promise<ArrendatarioBusqueda | null> {
  const cedula = opts.cedula?.trim() ?? ""
  const nombre = opts.nombre?.trim() ?? ""

  if (role === "admin") {
    if (cedula) {
      const { data } = await admin
        .from("arrendatarios")
        .select("id, email, nombre, cedula")
        .eq("cedula", cedula)
        .limit(1)
      if (data?.[0]) return data[0] as ArrendatarioBusqueda
      if (!nombre) return null
    }

    if (nombre) {
      const { data } = await admin
        .from("arrendatarios")
        .select("id, email, nombre, cedula")
        .ilike("nombre", `%${nombre}%`)
        .limit(1)
      return (data?.[0] as ArrendatarioBusqueda) ?? null
    }

    return null
  }

  if (role === "propietario") {
    const lista = await arrendatariosDelPropietario(admin, requesterId)
    if (cedula) {
      const porCedula = lista.find((a) => (a.cedula ?? "").trim() === cedula)
      if (porCedula) return porCedula
      if (!nombre) return null
    }
    if (nombre) {
      const term = nombre.toLowerCase()
      return lista.find((a) => (a.nombre ?? "").toLowerCase().includes(term)) ?? null
    }
  }

  return null
}

/** Solo admin y propietario (operaciones de gestión inmobiliaria). */
export function requireAdminOrPropietarioRole(role: UserRole): NextResponse | null {
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  return null
}

type MantenimientoRow = {
  id: string
  propiedad_id: string
  assigned_to?: string | null
  propiedades?: { user_id?: string } | { user_id?: string }[] | null
}

/**
 * Valida lectura/edición de una solicitud de mantenimiento.
 * Admin: cualquiera. Propietario: solo sus propiedades. maintenance_special: solo asignadas.
 */
export function assertMantenimientoSolicitudAccess(
  role: UserRole,
  userId: string,
  solicitud: MantenimientoRow
): NextResponse | null {
  if (role === "admin") return null

  if (role === "maintenance_special") {
    if (solicitud.assigned_to === userId) return null
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (role === "propietario") {
    const propRaw = solicitud.propiedades
    const prop = propRaw == null ? null : Array.isArray(propRaw) ? propRaw[0] : propRaw
    if (prop?.user_id === userId) return null
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 403 })
}

/** Carga solicitud y valida acceso antes de operar sobre gestiones/adjuntos. */
export async function loadMantenimientoSolicitudForAccess(
  admin: SupabaseClient,
  role: UserRole,
  userId: string,
  solicitudId: string,
  select = "id, assigned_to, propiedades ( user_id )"
): Promise<{ solicitud: MantenimientoRow } | { response: NextResponse }> {
  const { data, error } = await admin
    .from("solicitudes_mantenimiento")
    .select(select)
    .eq("id", solicitudId)
    .maybeSingle()

  if (error || !data) {
    return { response: NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 }) }
  }

  const solicitud = data as unknown as MantenimientoRow
  const denied = assertMantenimientoSolicitudAccess(role, userId, solicitud)
  if (denied) return { response: denied }

  return { solicitud }
}
