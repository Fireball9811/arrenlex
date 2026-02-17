import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/supabase/admin"

/**
 * GET /api/admin/dashboard/metrics
 * Devuelve todas las métricas para el dashboard del admin
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // 1. Usuarios
  const { data: usuarios } = await admin
    .from("perfiles")
    .select("activo, bloqueado, role")

  const usuariosActivos = usuarios?.filter(u => u.activo && !u.bloqueado).length ?? 0
  const usuariosInactivos = usuarios?.filter(u => !u.activo && !u.bloqueado).length ?? 0
  const usuariosBloqueados = usuarios?.filter(u => u.bloqueado).length ?? 0
  const usuariosTotales = usuarios?.length ?? 0

  // Roles de usuarios activos
  const usuariosActivosData = usuarios?.filter(u => u.activo && !u.bloqueado) ?? []
  const rolesUsuariosActivos = {
    admin: usuariosActivosData.filter(u => u.role === 'admin').length,
    propietario: usuariosActivosData.filter(u => u.role === 'propietario').length,
    inquilino: usuariosActivosData.filter(u => u.role === 'inquilino').length,
    maintenance_special: usuariosActivosData.filter(u => u.role === 'maintenance_special').length,
    insurance_special: usuariosActivosData.filter(u => u.role === 'insurance_special').length,
    lawyer_special: usuariosActivosData.filter(u => u.role === 'lawyer_special').length,
  }

  // 2. Contratos
  const { data: contratos } = await admin
    .from("contratos")
    .select("estado")

  const contratosCumplidos = contratos?.filter(c => c.estado === 'terminado').length ?? 0
  const contratosPendientes = contratos?.filter(c => c.estado === 'borrador').length ?? 0
  const contratosEnEjecucion = contratos?.filter(c => c.estado === 'activo').length ?? 0

  // 3. Mensajes (solicitudes_visita)
  const { data: mensajes } = await admin
    .from("solicitudes_visita")
    .select("status")

  const mensajesContestados = mensajes?.filter(m => m.status === 'contestado').length ?? 0
  const mensajesPendientes = mensajes?.filter(m => m.status === 'pendiente').length ?? 0
  const mensajesEnCurso = mensajes?.filter(m => m.status === 'esperando').length ?? 0

  // 4. Mantenimientos
  const { data: mantenimientos } = await admin
    .from("solicitudes_mantenimiento")
    .select("status")

  const mantPendientes = mantenimientos?.filter(m => m.status === 'pendiente').length ?? 0
  const mantEnEjecucion = mantenimientos?.filter(m => m.status === 'ejecucion').length ?? 0
  const mantCompletados = mantenimientos?.filter(m => m.status === 'completado').length ?? 0

  // 5. Propiedades
  const { data: propiedades } = await admin
    .from("propiedades")
    .select("estado")

  const propsArrendadas = propiedades?.filter(p => p.estado === 'arrendado').length ?? 0
  const propsPendientes = propiedades?.filter(p => p.estado === 'pendiente').length ?? 0
  const propsDisponibles = propiedades?.filter(p => p.estado === 'disponible').length ?? 0

  // 6. Movimiento de Rentas
  const { data: contratosRentas } = await admin
    .from("contratos")
    .select("propiedad_id, duracion_meses")

  const totalContratos = contratosRentas?.length ?? 0
  const propiedadesUnicas = new Set(contratosRentas?.map(c => c.propiedad_id) || []).size
  const promedioVecesRentada = propiedadesUnicas > 0 ? (totalContratos / propiedadesUnicas).toFixed(1) : '0'
  const promedioDuracion = contratosRentas && contratosRentas.length > 0
    ? (contratosRentas.reduce((sum, c) => sum + (c.duracion_meses || 0), 0) / contratosRentas.length).toFixed(1)
    : '0'

  return NextResponse.json({
    usuarios: {
      activos: usuariosActivos,
      inactivos: usuariosInactivos,
      bloqueados: usuariosBloqueados,
      totales: usuariosTotales,
      rolesActivos: rolesUsuariosActivos
    },
    contratos: {
      cumplidos: contratosCumplidos,
      pendientes: contratosPendientes,
      enEjecucion: contratosEnEjecucion
    },
    mensajes: {
      contestados: mensajesContestados,
      pendientes: mensajesPendientes,
      enCurso: mensajesEnCurso
    },
    mantenimientos: {
      pendientes: mantPendientes,
      enEjecucion: mantEnEjecucion,
      completados: mantCompletados
    },
    propiedades: {
      arrendadas: propsArrendadas,
      pendientes: propsPendientes,
      disponibles: propsDisponibles
    },
    movimientoRentas: {
      totalContratos,
      propiedadesRentadas: propiedadesUnicas,
      promedioVecesRentada: Number(promedioVecesRentada),
      promedioDuracionMeses: Number(promedioDuracion)
    }
  })
}
