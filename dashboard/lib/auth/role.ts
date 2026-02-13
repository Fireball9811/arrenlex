import type { SupabaseClient } from "@supabase/supabase-js"
import { isAdmin } from "@/lib/supabase/admin"

export type UserRole = "admin" | "propietario" | "inquilino"

export async function getUserRole(
  supabase: SupabaseClient,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<UserRole> {
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
