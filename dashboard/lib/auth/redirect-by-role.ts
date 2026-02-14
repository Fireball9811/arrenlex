import type { UserRole } from "./role"

/**
 * Redirección centralizada tras login/callback según rol.
 * Un solo punto de verdad para rutas por rol.
 */
export function getDashboardPathByRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard"
    case "propietario":
      return "/propietario/dashboard"
    case "inquilino":
      return "/inquilino/dashboard"
    default:
      return "/inquilino/dashboard"
  }
}
