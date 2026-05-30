import type { SupabaseClient } from "@supabase/supabase-js"
import type { UserRole } from "@/lib/auth/role"

export async function getPropietarioPropiedadIds(
  admin: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await admin.from("propiedades").select("id").eq("user_id", userId)
  return (data ?? []).map((p: { id: string }) => p.id)
}

export function canReadIntakeRow(
  role: UserRole,
  intake: { propiedad_id: string | null },
  propiedadIds: string[]
): boolean {
  if (role === "admin") return true
  if (!intake.propiedad_id) return false
  return propiedadIds.includes(intake.propiedad_id)
}
