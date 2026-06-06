import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole, type UserRole } from "@/lib/auth/role"

export type SessionUser = {
  id: string
  email: string | null
  role: UserRole
  nombre: string
  cedula: string
}

/**
 * Obtiene usuario, rol y perfil en una sola pasada (para layouts servidor).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const role = await getUserRole(supabase, user)
  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from("perfiles")
    .select("nombre, cedula")
    .eq("id", user.id)
    .single()

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    nombre: perfil?.nombre ?? "",
    cedula: perfil?.cedula ?? "",
  }
}
