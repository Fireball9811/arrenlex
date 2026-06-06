export const ROLE_CACHE_KEY = "arrenlex_user_role"

export function clearAuthClientCache(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(ROLE_CACHE_KEY)
  }
}

/**
 * Cierra sesión en el servidor (limpia cookies SSR) y borra caché local de rol.
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  clearAuthClientCache()

  try {
    const res = await fetch("/api/auth/logout", { method: "POST" })
    if (!res.ok) {
      return { success: false, error: "No se pudo cerrar la sesión" }
    }
    return { success: true }
  } catch {
    return { success: false, error: "Error de conexión al cerrar sesión" }
  }
}
