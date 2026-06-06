import { NextResponse } from "next/server"
import { isApiAuth, requireApiAuth } from "@/lib/auth/api-auth"
import { getNavCounts } from "@/lib/nav/counts-server"

/**
 * GET /api/nav/counts
 * Contadores unificados del sidebar (solicitudes, intake, mantenimiento).
 */
export async function GET() {
  const authResult = await requireApiAuth()
  if (!isApiAuth(authResult)) return authResult

  const counts = await getNavCounts(authResult.userId, authResult.role)
  return NextResponse.json(counts)
}
