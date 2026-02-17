import type { SupabaseClient } from "@supabase/supabase-js"
import { isAdmin } from "@/lib/supabase/admin"

export type UserRole = "admin" | "propietario" | "inquilino" | "maintenance_special" | "insurance_special" | "lawyer_special"

const VALID_ROLES: UserRole[] = ["admin", "propietario", "inquilino", "maintenance_special", "insurance_special", "lawyer_special"]

export async function getUserRole(
  supabase: SupabaseClient,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<UserRole> {
  // Fuente de verdad: tabla perfiles (por user_id = auth.users.id)
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const roleFromDb = perfil?.role as UserRole | undefined
  if (roleFromDb && VALID_ROLES.includes(roleFromDb)) return roleFromDb

  // Fallback: lista de admins por env (solo si no hay perfil o rol no definido)
  if (isAdmin(user.email)) return "admin"

  const meta = user.user_metadata as Record<string, unknown> | undefined
  const rolMeta = meta?.rol as string | undefined
  if (rolMeta === "inquilino") return "inquilino"
  if (rolMeta === "propietario") return "propietario"

  const { count } = await supabase
    .from("propiedades")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  if (count && count > 0) return "propietario"

  return "inquilino"
}
