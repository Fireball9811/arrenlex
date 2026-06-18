import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/debug/intake-diagnostico?intakeId=xxx
 * 
 * Diagnóstico: Muestra exactamente qué datos tiene el intake seleccionado
 * y si hay coarrendatarios en el mismo grupo
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const intakeId = searchParams.get("intakeId")

  if (!intakeId) {
    return NextResponse.json({ error: "intakeId es requerido" }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Obtener el intake principal
  const { data: intake } = await admin
    .from("arrenlex_form_intake")
    .select("*")
    .eq("id", intakeId)
    .maybeSingle()

  if (!intake) {
    return NextResponse.json({ error: "Intake no encontrado", intakeId }, { status: 404 })
  }

  // 2. Buscar otros registros del mismo grupo
  let registrosDelGrupo: any[] = []
  if (intake.grupo_solicitud_id) {
    const { data: registros } = await admin
      .from("arrenlex_form_intake")
      .select("*")
      .eq("grupo_solicitud_id", intake.grupo_solicitud_id)

    registrosDelGrupo = registros || []
  }

  return NextResponse.json({
    diagnostico: {
      intake_principal: {
        id: intake.id,
        nombre: intake.nombre,
        email: intake.email,
        propiedad_id: intake.propiedad_id,
        grupo_solicitud_id: intake.grupo_solicitud_id,
        tipo_solicitante: intake.tipo_solicitante,
        cedula: intake.cedula,
        salario_principal: intake.salario_principal,
        coarrendatario_nombre: intake.coarrendatario_nombre,
      },
      registros_en_el_grupo: registrosDelGrupo.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        email: r.email,
        tipo_solicitante: r.tipo_solicitante,
        cedula: r.cedula,
        salario_principal: r.salario_principal,
        propiedad_id: r.propiedad_id,
      })),
      resumen: {
        grupo_solicitud_id_presente: !!intake.grupo_solicitud_id,
        grupo_solicitud_id_valor: intake.grupo_solicitud_id || null,
        total_registros_en_grupo: registrosDelGrupo.length,
        hay_coarrendatario_en_grupo: registrosDelGrupo.filter(
          (r) => r.tipo_solicitante !== intake.tipo_solicitante
        ).length > 0,
      },
    },
  })
}
