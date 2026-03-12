import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/propietario/dashboard
 * Retorna conteos para el dashboard del propietario:
 * - Número de propiedades
 * - Número de contratos activos
 * - Número de invitaciones enviadas
 * - Pagos recibidos en el último año
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "propietario") {
    return NextResponse.json(
      { error: "Solo propietarios pueden acceder a este recurso" },
      { status: 403 }
    )
  }

  const admin = createAdminClient()

  try {
    // Contar propiedades del propietario
    const { count: propiedadesCount } = await admin
      .from("propiedades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)

    // Contar contratos activos del propietario (a través de sus propiedades)
    const { data: propiedades } = await admin
      .from("propiedades")
      .select("id")
      .eq("user_id", user.id)

    const propiedadIds = (propiedades ?? []).map((p: { id: string }) => p.id)

    let contratosCount = 0
    if (propiedadIds.length > 0) {
      const { count } = await admin
        .from("contratos")
        .select("id", { count: "exact", head: true })
        .in("propiedad_id", propiedadIds)
        .eq("estado", "activo")

      contratosCount = count ?? 0
    }

    // Contar invitaciones enviadas (inquilinos invitados por este propietario)
    // Referencia: es el que crea los contratos/invitaciones
    const { count: invitacionesCount } = await admin
      .from("inquilinos")
      .select("id", { count: "exact", head: true })
      .eq("propietario_id", user.id)

    // Pagos recibidos en el último año
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const oneYearAgoISO = oneYearAgo.toISOString()

    let pagosLastYear = 0
    if (propiedadIds.length > 0) {
      const { count } = await admin
        .from("pagos")
        .select("id", { count: "exact", head: true })
        .in("propiedad_id", propiedadIds)
        .eq("estado", "aprobado")
        .gte("fecha_pago", oneYearAgoISO)
    
      pagosLastYear = count ?? 0
    }

    // Monto total recibido en el último año
    let montoTotalLastYear = 0
    if (propiedadIds.length > 0) {
      const { data: pagos } = await admin
        .from("pagos")
        .select("monto")
        .in("propiedad_id", propiedadIds)
        .eq("estado", "aprobado")
        .gte("fecha_pago", oneYearAgoISO)

      montoTotalLastYear = (pagos ?? []).reduce(
        (sum: number, pago: { monto: number }) => sum + (pago.monto ?? 0),
        0
      )
    }

    return NextResponse.json({
      propiedades: propiedadesCount ?? 0,
      contratos: contratosCount,
      invitaciones: invitacionesCount ?? 0,
      pagosLastYear,
      montoTotalLastYear,
    })
  } catch (err) {
    console.error("[GET /api/propietario/dashboard]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
