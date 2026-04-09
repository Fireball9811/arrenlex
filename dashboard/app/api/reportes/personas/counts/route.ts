import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Obtiene contadores dinámicos para cada categoría de personas
 * - Admin: ve todos los contadores
 * - Propietario: solo ve contadores de sus propios arrendatarios/contratos
 */
export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Obtener rol del usuario
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)

  try {
    // Contar inquilinos activos = arrendatarios con contratos activos
    // Si es propietario, contar solo sus contratos. Si es admin, contar todos.
    let queryInquilinos = admin
      .from("contratos")
      .select("*", { count: "exact", head: true })
      .eq("estado", "activo")

    if (role === "propietario") {
      queryInquilinos = queryInquilinos.eq("user_id", user.id)
    }

    const { count: inquilinosActivos } = await queryInquilinos

    // Contar propietarios
    let queryPropietarios = supabase
      .from("perfiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "propietario")

    // Si es propietario, contar solo a sí mismo
    if (role === "propietario") {
      queryPropietarios = queryPropietarios.eq("id", user.id)
    }

    const { count: propietarios } = await queryPropietarios

    // Contar administradores (solo admin ve esto)
    let admins = 0
    if (role === "admin") {
      const { count } = await supabase
        .from("perfiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin")
      admins = count || 0
    }

    // Contar roles especiales
    let rolesEspeciales = 0
    if (role === "admin") {
      const { count } = await supabase
        .from("perfiles")
        .select("*", { count: "exact", head: true })
        .in("role", ["maintenance_special", "insurance_special", "lawyer_special"])
      rolesEspeciales = count || 0
    }

    // Inquilinos inactivos = arrendatarios sin contrato O con contrato inactivo
    let historialInquilinos = 0

    if (role === "propietario") {
      // Para propietarios, necesitamos un enfoque diferente
      // Obtener IDs de arrendatarios con contrato activo del propietario
      const { data: contratosActivos } = await admin
        .from("contratos")
        .select("arrendatario_id")
        .eq("user_id", user.id)
        .in("estado", ["activo", "borrador"])

      const arrendatariosActivosIds = new Set(
        (contratosActivos || []).map(c => c.arrendatario_id)
      )

      // Contar todos los arrendatarios menos los que tienen contrato activo
      const { count: totalArrendatarios } = await supabase
        .from("arrendatarios")
        .select("*", { count: "exact", head: true })

      historialInquilinos = (totalArrendatarios || 0) - arrendatariosActivosIds.size
    } else {
      // Admin: contar todos los arrendatarios inactivos
      const { data: arrendatariosConContratos } = await admin
        .from("arrendatarios")
        .select("id, contratos(estado)")

      const estadosActivos = new Set(["activo", "borrador"])

      if (arrendatariosConContratos) {
        historialInquilinos = arrendatariosConContratos.filter(arrendatario => {
          const contratos = arrendatario.contratos || []
          if (contratos.length === 0) return true // Sin contrato
          const tieneContratoActivo = contratos.some((c: any) => estadosActivos.has(c.estado))
          return !tieneContratoActivo // Solo contratos inactivos
        }).length
      }
    }

    // Usuarios inquilinos (solo admin ve esto)
    let usuariosSistema = 0
    let inquilinosUsuariosTotal = 0

    if (role === "admin") {
      const { count: inquilinosCount } = await supabase
        .from("perfiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "inquilino")
      inquilinosUsuariosTotal = inquilinosCount || 0

      // Total de usuarios del sistema (solo admin ve esto)
      usuariosSistema = (inquilinosUsuariosTotal || 0) +
                         (propietarios || 0) +
                         (admins || 0) +
                         (rolesEspeciales || 0)
    }

    // Contar roles únicos disponibles en el sistema
    let roles = 0
    if (role === "admin") {
      roles = [
        "admin",
        "propietario",
        "inquilino",
        "maintenance_special",
        "insurance_special",
        "lawyer_special"
      ].length
    } else {
      // Propietario solo ve su propio rol
      roles = 1
    }

    // Contar contactos = usuarios activos y no bloqueados
    let queryContactos = supabase
      .from("perfiles")
      .select("*", { count: "exact", head: true })
      .eq("activo", true)
      .eq("bloqueado", false)

    // Si es propietario, contar solo a sí mismo
    if (role === "propietario") {
      queryContactos = queryContactos.eq("id", user.id)
    }

    const { count: contactos } = await queryContactos

    return NextResponse.json({
      inquilinosActivos: inquilinosActivos || 0,
      propietarios: propietarios || 0,
      usuariosSistema,
      historialInquilinos: historialInquilinos || 0,
      roles,
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
