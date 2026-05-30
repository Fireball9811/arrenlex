import type { SupabaseClient } from "@supabase/supabase-js"
import type { UserRole } from "@/lib/auth/role"

/**
 * Admin siempre; propietario solo su propio perfil (id = auth user).
 */
export function canReadPerfilById(
  role: UserRole,
  requesterId: string,
  targetPerfilId: string
): boolean {
  if (role === "admin") return true
  if (role === "propietario") return requesterId === targetPerfilId
  return false
}

type PerfilBusqueda = {
  id: string
  email: string
  nombre: string | null
  cedula: string | null
}

/**
 * Propietario: solo puede resolver email de su propio perfil por nombre (envío de recibos).
 * Admin: búsqueda global (comportamiento anterior).
 */
export async function buscarPerfilPorNombre(
  admin: SupabaseClient,
  role: UserRole,
  requesterId: string,
  nombre: string
): Promise<PerfilBusqueda | null> {
  const term = nombre.trim()

  if (role === "admin") {
    const { data, error } = await admin
      .from("perfiles")
      .select("id, email, nombre, cedula")
      .ilike("nombre", `%${term}%`)
      .limit(1)

    if (error || !data?.length) return null
    return data[0] as PerfilBusqueda
  }

  if (role === "propietario") {
    const { data: self, error } = await admin
      .from("perfiles")
      .select("id, email, nombre, cedula")
      .eq("id", requesterId)
      .maybeSingle()

    if (error || !self?.email) return null

    const nombreSelf = (self.nombre ?? "").trim().toLowerCase()
    if (!nombreSelf || !nombreSelf.includes(term.toLowerCase())) {
      return null
    }

    return self as PerfilBusqueda
  }

  return null
}
