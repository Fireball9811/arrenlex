import { NextResponse } from "next/server"

const MIGRATION_HINT =
  "Aplica en Supabase el SQL de supabase/migrations/062_aplicacion_tokens_grupo_tipo.sql (columnas grupo_solicitud_id y tipo_solicitante en aplicacion_tokens)."

/** Errores típicos cuando faltan columnas o el esquema no está actualizado */
export function sugiereMigracion062(message: string): boolean {
  return /42703|column|does not exist|schema cache|Could not find the .* column/i.test(message)
}

export function respuestaErrorGeneracionTokens(
  logLabel: string,
  err: { message: string; code?: string },
  userMessage: string
) {
  console.error(logLabel, err)
  const body: Record<string, unknown> = { error: userMessage }
  if (sugiereMigracion062(err.message)) {
    body.hint = MIGRATION_HINT
  }
  if (process.env.NODE_ENV === "development") {
    body.details = err.message
    if (err.code) body.code = err.code
  }
  return NextResponse.json(body, { status: 500 })
}
