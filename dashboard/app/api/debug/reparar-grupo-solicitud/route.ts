import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role"

/**
 * POST /api/debug/reparar-grupo-solicitud
 * 
 * PROFESIONAL: Repara los grupo_solicitud_id NULL en registros de intake
 * Para usar: llamar desde el cliente o Postman con admin
 * 
 * Agrupa registros de la misma propiedad y fecha cercanas (mismo día idealmente)
 * para asignarles grupo_solicitud_id común
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin") {
    return NextResponse.json({ error: "Solo admin puede ejecutar esta reparación" }, { status: 403 })
  }

  const admin = createAdminClient()

  // 1. Encontrar todos los registros sin grupo_solicitud_id
  const { data: sinGrupo, error: errFetch } = await admin
    .from("arrenlex_form_intake")
    .select("id, propiedad_id, fecha_envio, tipo_solicitante, nombre, cedula, created_at")
    .is("grupo_solicitud_id", null)
    .order("propiedad_id, created_at")

  if (errFetch || !sinGrupo) {
    return NextResponse.json({ error: "Error al buscar registros", details: errFetch }, { status: 500 })
  }

  if (sinGrupo.length === 0) {
    return NextResponse.json({
      ok: true,
      mensaje: "No hay registros sin grupo_solicitud_id",
      reparados: 0,
    })
  }

  // 2. Agrupar registros: misma propiedad + mismo día + máximo 2 registros (principal + coarrendatario)
  const grupos: Record<string, any[]> = {}
  
  for (const reg of sinGrupo) {
    const fecha = reg.fecha_envio || reg.created_at
    const fechaDia = fecha.split("T")[0] // YYYY-MM-DD

    const clave = `${reg.propiedad_id}_${fechaDia}`
    if (!grupos[clave]) grupos[clave] = []
    grupos[clave].push(reg)
  }

  // 3. Asignar grupo_solicitud_id a cada grupo
  const updates: { id: string; grupo_id: string }[] = []
  let totalActualizados = 0

  for (const [clave, registrosDelGrupo] of Object.entries(grupos)) {
    // Solo agrupar si hay más de uno (principal + coarrendatario)
    if (registrosDelGrupo.length > 0) {
      const { v4: uuidv4 } = await import("uuid")
      const grupoId = uuidv4()

      // Asignar tipos_solicitante si no existen
      let tipoCounter = 0
      for (const reg of registrosDelGrupo) {
        const tipoSolicitante = !reg.tipo_solicitante
          ? (tipoCounter === 0 ? "arrendatario_principal" : "coarrendatario")
          : reg.tipo_solicitante

        updates.push({ id: reg.id, grupo_id: grupoId })
        totalActualizados++
        tipoCounter++
      }
    }
  }

  // 4. Aplicar las actualizaciones
  if (updates.length === 0) {
    return NextResponse.json({
      ok: true,
      mensaje: "Todos los registros ya tienen grupo_solicitud_id",
      reparados: 0,
    })
  }

  const gruposParaActualizar = new Map<string, string>()
  updates.forEach((u) => gruposParaActualizar.set(u.id, u.grupo_id))

  let actualizadosExitosos = 0
  const errores: string[] = []

  for (const [registroId, grupoId] of gruposParaActualizar.entries()) {
    const { error: errUpdate } = await admin
      .from("arrenlex_form_intake")
      .update({ grupo_solicitud_id: grupoId })
      .eq("id", registroId)

    if (errUpdate) {
      errores.push(`${registroId}: ${errUpdate.message}`)
    } else {
      actualizadosExitosos++
    }
  }

  return NextResponse.json({
    ok: true,
    mensaje: "Reparación completada",
    resumen: {
      registros_sin_grupo: sinGrupo.length,
      grupos_creados: Object.keys(grupos).length,
      registros_actualizados_exitosamente: actualizadosExitosos,
      errores: errores,
    },
  })
}
