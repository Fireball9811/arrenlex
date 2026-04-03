import { NextResponse } from "next/server"

/**
 * Centralized API error handler.
 * - Logs full stack trace to server console (visible in Vercel logs)
 * - Returns a generic message to the client (never exposes internals)
 */
export function handleApiError(
  context: string,
  err: unknown,
  status = 500
): NextResponse {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  console.error(`[${context}] Error:`, message)
  if (stack) console.error(`[${context}] Stack:`, stack)

  return NextResponse.json(
    { error: "Internal server error" },
    { status }
  )
}

/**
 * Wraps a Supabase error for consistent logging.
 * Use when a Supabase query returns { error }.
 */
export function handleSupabaseError(
  context: string,
  error: { message: string; details?: string; hint?: string; code?: string },
  status = 500
): NextResponse {
  console.error(`[${context}] Supabase error:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  })

  return NextResponse.json(
    { error: "Internal server error" },
    { status }
  )
}
