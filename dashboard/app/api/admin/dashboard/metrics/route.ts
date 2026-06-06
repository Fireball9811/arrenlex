import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminRole } from "@/lib/auth/role"

async function countWhere(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  filters: Record<string, string | boolean>
): Promise<number> {
  let query = admin.from(table).select("*", { count: "exact", head: true })
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value)
  }
  const { count } = await query
  return count ?? 0
}

/**
 * GET /api/admin/dashboard/metrics
 * Devuelve todas las métricas para el dashboard del admin
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (!(await isAdminRole(supabase, user.id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  const [
    usuariosActivos,
    usuariosInactivos,
    usuariosBloqueados,
    usuariosTotales,
    roleAdmin,
    rolePropietario,
    roleInquilino,
    roleMaintenance,
    roleInsurance,
    roleLawyer,
    contratosCumplidos,
    contratosPendientes,
    contratosEnEjecucion,
    mensajesContestados,
    mensajesPendientes,
    mensajesEnCurso,
    mantPendientes,
    mantEnEjecucion,
    mantCompletados,
    propsArrendadas,
    propsPendientes,
    propsDisponibles,
    contratosRentasRes,
  ] = await Promise.all([
    countWhere(admin, "perfiles", { activo: true, bloqueado: false }),
    countWhere(admin, "perfiles", { activo: false, bloqueado: false }),
    countWhere(admin, "perfiles", { bloqueado: true }),
    countWhere(admin, "perfiles", {}),
    countWhere(admin, "perfiles", { activo: true, bloqueado: false, role: "admin" }),
    countWhere(admin, "perfiles", { activo: true, bloqueado: false, role: "propietario" }),
    countWhere(admin, "perfiles", { activo: true, bloqueado: false, role: "inquilino" }),
    countWhere(admin, "perfiles", { activo: true, bloqueado: false, role: "maintenance_special" }),
    countWhere(admin, "perfiles", { activo: true, bloqueado: false, role: "insurance_special" }),
    countWhere(admin, "perfiles", { activo: true, bloqueado: false, role: "lawyer_special" }),
    countWhere(admin, "contratos", { estado: "terminado" }),
    countWhere(admin, "contratos", { estado: "borrador" }),
    countWhere(admin, "contratos", { estado: "activo" }),
    countWhere(admin, "solicitudes_visita", { status: "contestado" }),
    countWhere(admin, "solicitudes_visita", { status: "pendiente" }),
    countWhere(admin, "solicitudes_visita", { status: "esperando" }),
    countWhere(admin, "solicitudes_mantenimiento", { status: "pendiente" }),
    countWhere(admin, "solicitudes_mantenimiento", { status: "ejecucion" }),
    countWhere(admin, "solicitudes_mantenimiento", { status: "completado" }),
    countWhere(admin, "propiedades", { estado: "arrendado" }),
    countWhere(admin, "propiedades", { estado: "pendiente" }),
    countWhere(admin, "propiedades", { estado: "disponible" }),
    admin.from("contratos").select("propiedad_id, duracion_meses"),
  ])

  const contratosRentas = contratosRentasRes.data ?? []
  const totalContratos = contratosRentas.length
  const propiedadesUnicas = new Set(contratosRentas.map((c) => c.propiedad_id)).size
  const promedioVecesRentada =
    propiedadesUnicas > 0 ? Number((totalContratos / propiedadesUnicas).toFixed(1)) : 0
  const promedioDuracion =
    totalContratos > 0
      ? Number(
          (
            contratosRentas.reduce((sum, c) => sum + (c.duracion_meses || 0), 0) /
            totalContratos
          ).toFixed(1)
        )
      : 0

  return NextResponse.json({
    usuarios: {
      activos: usuariosActivos,
      inactivos: usuariosInactivos,
      bloqueados: usuariosBloqueados,
      totales: usuariosTotales,
      rolesActivos: {
        admin: roleAdmin,
        propietario: rolePropietario,
        inquilino: roleInquilino,
        maintenance_special: roleMaintenance,
        insurance_special: roleInsurance,
        lawyer_special: roleLawyer,
      },
    },
    contratos: {
      cumplidos: contratosCumplidos,
      pendientes: contratosPendientes,
      enEjecucion: contratosEnEjecucion,
    },
    mensajes: {
      contestados: mensajesContestados,
      pendientes: mensajesPendientes,
      enCurso: mensajesEnCurso,
    },
    mantenimientos: {
      pendientes: mantPendientes,
      enEjecucion: mantEnEjecucion,
      completados: mantCompletados,
    },
    propiedades: {
      arrendadas: propsArrendadas,
      pendientes: propsPendientes,
      disponibles: propsDisponibles,
    },
    movimientoRentas: {
      totalContratos,
      propiedadesRentadas: propiedadesUnicas,
      promedioVecesRentada,
      promedioDuracionMeses: promedioDuracion,
    },
  })
}
