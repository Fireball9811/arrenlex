import { NextResponse } from "next/server"
import { clearSessionCookie } from "@/lib/auth/session-sql"

/**
 * POST /api/auth/logout
 * Limpia la cookie de sesión SQL (JWT).
 */
export async function POST() {
  await clearSessionCookie()
  return NextResponse.json({ success: true })
}
