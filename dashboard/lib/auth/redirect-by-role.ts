import type { UserRole } from "./role"

/**
 * Redirección centralizada tras login/callback según rol.
 * Un solo punto de verdad para rutas por rol.
 */
export function getDashboardPathByRole(role: UserRole): string {
  return "/dashboard"
}
