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
    case "maintenance_special":
      return "/dashboard/maintenance"
    case "insurance_special":
      return "/dashboard/insurance"
    case "lawyer_special":
      return "/dashboard/legal"
    default:
      return "/dashboard"
  }
}

/**
 * Verifica si un rol es uno de los roles especiales
 */
export function isSpecialRole(role: UserRole): boolean {
  return role === "maintenance_special" ||
         role === "insurance_special" ||
         role === "lawyer_special"
}

/**
 * Obtiene la ruta permitida para un rol especial
 */
export function getAllowedRouteForSpecialRole(role: UserRole): string {
  switch (role) {
    case "maintenance_special":
      return "/dashboard/maintenance"
    case "insurance_special":
      return "/dashboard/insurance"
    case "lawyer_special":
      return "/dashboard/legal"
    default:
      return "/dashboard"
  }
}
