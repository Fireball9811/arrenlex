import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role"

/**
 * API para obtener contadores de propiedades
 * Endpoint: /api/reportes/propiedades/counts
 * Admin: todas las propiedades. Propietario: solo sus propiedades.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  // Detectar si es propietario para filtrar por sus propiedades
  let propietarioId: string | null = null
  if (user) {
    const role = await getUserRole(supabase, user)
    if (role === "propietario") {
      propietarioId = user.id
    }
  }

  const buildCountQuery = (estado: string) => {
    let q = admin.from("propiedades").select("*", { count: "exact", head: true }).eq("estado", estado)
    if (propietarioId) q = q.eq("user_id", propietarioId)
    return q
  }

  try {
    // Contar propiedades por estado
    const { count: disponibles, error: errDisponibles } = await buildCountQuery("disponible")
    const { count: arrendadas, error: errArrendadas } = await buildCountQuery("arrendado")
    const { count: mantenimiento, error: errMantenimiento } = await buildCountQuery("mantenimiento")
    const { count: pendientes, error: errPendientes } = await buildCountQuery("pendiente")

    // Log de errores para debugging
    if (errDisponibles) console.error("[api/reportes/propiedades/counts] Error contando disponibles:", errDisponibles)
    if (errArrendadas) console.error("[api/reportes/propiedades/counts] Error contando arrendadas:", errArrendadas)
    if (errMantenimiento) console.error("[api/reportes/propiedades/counts] Error contando mantenimiento:", errMantenimiento)
    if (errPendientes) console.error("[api/reportes/propiedades/counts] Error contando pendientes:", errPendientes)

    // Total de propiedades
    const total = (disponibles || 0) + (arrendadas || 0) + (mantenimiento || 0) + (pendientes || 0)

    // Tasa de ocupación
    const tasaOcupacion = total > 0 ? Math.round(((arrendadas || 0) / total) * 100) : 0

    // Promedio de ingresos (sumar valor_arriendo de las propiedades filtradas)
    let ingresoQuery = admin.from("propiedades").select("valor_arriendo")
    if (propietarioId) ingresoQuery = ingresoQuery.eq("user_id", propietarioId)
    const { data: todasProps, error: errProps } = await ingresoQuery

    if (errProps) console.error("[api/reportes/propiedades/counts] Error obteniendo valores:", errProps)

    const totalIngresos = (todasProps || []).reduce((sum, p) => sum + (p.valor_arriendo || 0), 0)
    const promedioIngresos = total > 0 ? Math.round(totalIngresos / total) : 0

    return NextResponse.json({
      disponibles: disponibles || 0,
      arrendadas: arrendadas || 0,
      mantenimiento: mantenimiento || 0,
      pendientes: pendientes || 0,
      total,
      tasaOcupacion,
      promedioIngresos
    })
  } catch (error) {
    console.error("[api/reportes/propiedades/counts] Error:", error)
    return NextResponse.json(
      { error: "Error al obtener contadores de propiedades" },
      { status: 500 }
    )
  }
}
