import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Obtiene contadores dinámicos para cada categoría de personas
 * Endpoint: /api/reportes/personas/counts
 */
export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()

  try {
    // Contar inquilinos activos = SOLO arrendatarios con contratos activos
    const { count: inquilinosActivos, error: errInquilinos } = await admin
      .from("contratos")
      .select("*", { count: "exact", head: true })
      .eq("estado", "activo")

    // Contar propietarios (todos, sin importar si están activos)
    const { count: propietarios, error: errPropietarios } = await supabase
      .from("perfiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "propietario")

    // Contar administradores
    const { count: admins, error: errAdmins } = await supabase
      .from("perfiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin")

    // Contar roles especiales (mantenimiento, seguros, legal)
    const { count: rolesEspeciales, error: errRolesEspeciales } = await supabase
      .from("perfiles")
      .select("*", { count: "exact", head: true })
      .in("role", ["maintenance_special", "insurance_special", "lawyer_special"])

    // Inquilinos inactivos = arrendatarios sin contrato O con contrato inactivo
    const { data: arrendatariosConContratos } = await admin
      .from("arrendatarios")
      .select("id, contratos(estado)")

    const estadosActivos = new Set(["activo", "borrador"])

    let historialInquilinos = 0
    if (arrendatariosConContratos) {
      historialInquilinos = arrendatariosConContratos.filter(arrendatario => {
        const contratos = arrendatario.contratos || []
        if (contratos.length === 0) return true // Sin contrato
        const tieneContratoActivo = contratos.some((c: any) => estadosActivos.has(c.estado))
        return !tieneContratoActivo // Solo contratos inactivos
      }).length
    }

    // Usuarios inquilinos (todos, activos e inactivos)
    const { count: inquilinosUsuariosTotal } = await supabase
      .from("perfiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "inquilino")

    // Total de usuarios del sistema (cuenta todos los usuarios en perfiles)
    const usuariosSistema = (inquilinosUsuariosTotal || 0) +
                           (propietarios || 0) +
                           (admins || 0) +
                           (rolesEspeciales || 0)

    // Contar roles únicos disponibles en el sistema
    const rolesDisponibles = [
      "admin",
      "propietario",
      "inquilino",
      "maintenance_special",
      "insurance_special",
      "lawyer_special"
    ].length

    // Contar contactos = usuarios activos y no bloqueados
    const { count: contactos } = await supabase
      .from("perfiles")
      .select("*", { count: "exact", head: true })
      .eq("activo", true)
      .eq("bloqueado", false)

    return NextResponse.json({
      inquilinosActivos: inquilinosActivos || 0,
      propietarios: propietarios || 0,
      usuariosSistema,
      historialInquilinos: historialInquilinos || 0,
      roles: rolesDisponibles,
      contactos: contactos || 0
    })

  } catch (error) {
    console.error("[api/reportes/personas/counts] Error:", error)
    return NextResponse.json(
      { error: "Error al obtener los contadores" },
      { status: 500 }
    )
  }
}
