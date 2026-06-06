import { headers } from "next/headers"
import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { getUserRole, type UserRole } from "@/lib/auth/role"

/** Headers internos: solo los establece middleware (se eliminan si vienen del cliente). */
export const AUTH_USER_ID_HEADER = "x-user-id"
export const AUTH_USER_ROLE_HEADER = "x-user-role"

const VALID_ROLES = new Set<UserRole>([
  "admin",
  "propietario",
  "inquilino",
  "maintenance_special",
  "insurance_special",
  "lawyer_special",
])

export type ApiAuth = {
  userId: string
  role: UserRole
  supabase: Awaited<ReturnType<typeof createClient>>
  user: Pick<User, "id">
}

function parseMiddlewareAuth(
  userId: string | null,
  role: string | null
): { userId: string; role: UserRole } | null {
  if (!userId || !role || !VALID_ROLES.has(role as UserRole)) return null
  return { userId, role: role as UserRole }
}

/**
 * Obtiene autenticación para rutas API.
 * Usa headers del middleware cuando existen; si no, valida sesión con getUser().
 */
export async function getApiAuth(): Promise<ApiAuth | null> {
  const headersList = await headers()
  const fromMiddleware = parseMiddlewareAuth(
    headersList.get(AUTH_USER_ID_HEADER),
    headersList.get(AUTH_USER_ROLE_HEADER)
  )

  const supabase = await createClient()

  if (fromMiddleware) {
    return {
      userId: fromMiddleware.userId,
      role: fromMiddleware.role,
      supabase,
      user: { id: fromMiddleware.userId },
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const role = await getUserRole(supabase, user)
  return {
    userId: user.id,
    role,
    supabase,
    user,
  }
}

export async function requireApiAuth(): Promise<ApiAuth | NextResponse> {
  const auth = await getApiAuth()
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  return auth
}

export function isApiAuth(value: ApiAuth | NextResponse): value is ApiAuth {
  return !(value instanceof NextResponse)
}
