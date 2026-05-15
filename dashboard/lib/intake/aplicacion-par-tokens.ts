import type { SupabaseClient } from "@supabase/supabase-js"

export type ParAplicacionTokensInsertOk = {
  ok: true
  principal: { token: string; tipo_solicitante: string; expira_en: string }
  coarrendatario: { token: string; tipo_solicitante: string; expira_en: string }
}

export type ParAplicacionTokensInsertErr = {
  ok: false
  error: { message: string; code?: string; hint?: string }
}

export type ParAplicacionTokensInsertResult = ParAplicacionTokensInsertOk | ParAplicacionTokensInsertErr

/**
 * Inserta dos filas en aplicacion_tokens (principal + coarrendatario) en dos INSERT:
 * algunos despliegues de PostgREST no devuelven todas las filas en bulk insert + select.
 */
export async function insertarParAplicacionTokens(
  admin: SupabaseClient,
  params: { propiedadId: string; grupoSolicitudId: string; expiraEn: string }
): Promise<ParAplicacionTokensInsertResult> {
  const base = {
    propiedad_id: params.propiedadId,
    grupo_solicitud_id: params.grupoSolicitudId,
    expira_en: params.expiraEn,
  }

  const { data: principal, error: errPrincipal } = await admin
    .from("aplicacion_tokens")
    .insert({ ...base, tipo_solicitante: "arrendatario_principal" })
    .select("token, tipo_solicitante, expira_en")
    .single()

  if (errPrincipal || !principal?.token) {
    return {
      ok: false,
      error: {
        message: errPrincipal?.message ?? "No se pudo crear el enlace del arrendatario principal",
        code: errPrincipal?.code,
        hint: errPrincipal?.hint,
      },
    }
  }

  const { data: coarrendatario, error: errCo } = await admin
    .from("aplicacion_tokens")
    .insert({ ...base, tipo_solicitante: "coarrendatario" })
    .select("token, tipo_solicitante, expira_en")
    .single()

  if (errCo || !coarrendatario?.token) {
    await admin.from("aplicacion_tokens").delete().eq("token", principal.token)
    return {
      ok: false,
      error: {
        message: errCo?.message ?? "No se pudo crear el enlace del coarrendatario",
        code: errCo?.code,
        hint: errCo?.hint,
      },
    }
  }

  return { ok: true, principal, coarrendatario }
}
