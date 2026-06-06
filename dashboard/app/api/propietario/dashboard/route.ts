import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/propietario/dashboard
 * Retorna conteos para el dashboard del propietario.
 */
export async function GET() {
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
    const { data: propiedades } = await admin
      .from("propiedades")
      .select("id")
      .eq("user_id", user.id)

    const propiedadIds = (propiedades ?? []).map((p: { id: string }) => p.id)
    const propiedadesCount = propiedadIds.length

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const oneYearAgoISO = oneYearAgo.toISOString()

    const [contratosRes, invitacionesRes, pagosCountRes, pagosMontoRes] =
      await Promise.all([
        propiedadIds.length > 0
          ? admin
              .from("contratos")
              .select("id", { count: "exact", head: true })
              .in("propiedad_id", propiedadIds)
              .eq("estado", "activo")
          : Promise.resolve({ count: 0 }),
        admin
          .from("inquilinos")
          .select("id", { count: "exact", head: true })
          .eq("propietario_id", user.id),
        propiedadIds.length > 0
          ? admin
              .from("pagos")
              .select("id", { count: "exact", head: true })
              .in("propiedad_id", propiedadIds)
              .eq("estado", "aprobado")
              .gte("fecha_pago", oneYearAgoISO)
          : Promise.resolve({ count: 0 }),
        propiedadIds.length > 0
          ? admin
              .from("pagos")
              .select("monto")
              .in("propiedad_id", propiedadIds)
              .eq("estado", "aprobado")
              .gte("fecha_pago", oneYearAgoISO)
          : Promise.resolve({ data: [] }),
      ])

    const montoTotalLastYear = (pagosMontoRes.data ?? []).reduce(
      (sum: number, pago: { monto: number }) => sum + (pago.monto ?? 0),
      0
    )

    return NextResponse.json({
      propiedades: propiedadesCount,
      contratos: contratosRes.count ?? 0,
      invitaciones: invitacionesRes.count ?? 0,
      pagosLastYear: pagosCountRes.count ?? 0,
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
