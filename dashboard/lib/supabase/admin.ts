import { createClient } from "@supabase/supabase-js"

/**
 * Cliente Supabase con service_role - SOLO para uso en servidor.
 * Permite operaciones de administrador como crear usuarios.
 * Nunca exponer service_role al cliente.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const admins = process.env.ADMIN_EMAILS ?? ""
  const placeholder = "REEMPLAZA_CON_TU_EMAIL"

  if (!admins.trim() || admins.trim() === placeholder) {
    return true
  }

  return admins.split(",").some((e) => e.trim().toLowerCase() === email.toLowerCase())
}
