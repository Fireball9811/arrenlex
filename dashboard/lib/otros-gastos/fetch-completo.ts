import type { SupabaseClient } from "@supabase/supabase-js"

/** Une la lista de gastos con perfiles (propietario que registró el gasto). */
export async function attachPropietariosList<
  T extends { user_id: string },
>(admin: SupabaseClient, rows: T[]): Promise<Array<T & { propietario: { id: string; email: string | null; nombre: string | null } | null }>> {
  if (!rows.length) return rows.map((r) => ({ ...r, propietario: null }))
  const ids = [...new Set(rows.map((r) => r.user_id))]
  const { data: perfiles } = await admin.from("perfiles").select("id, email, nombre").in("id", ids)
  const map = new Map((perfiles ?? []).map((p) => [p.id, p]))
  return rows.map((row) => ({
    ...row,
    propietario: map.get(row.user_id) ?? null,
  }))
}

const SELECT_OTROS_GASTO = `
  id,
  propiedad_id,
  user_id,
  nombre_completo,
  cedula,
  tarjeta_profesional,
  correo_electronico,
  motivo_pago,
  descripcion_trabajo,
  fecha_realizacion,
  valor,
  banco,
  referencia_pago,
  numero_recibo,
  fecha_emision,
  estado,
  created_at,
  updated_at,
  propiedades ( id, direccion, ciudad, barrio, titulo )
`

export async function fetchOtrosGastoCompleto(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from("otros_gastos").select(SELECT_OTROS_GASTO).eq("id", id).single()

  if (error || !data) return null

  const { data: perfil } = await admin.from("perfiles").select("email, nombre").eq("id", data.user_id).maybeSingle()

  return {
    ...data,
    propietario: perfil ?? null,
  }
}
