import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/propietario/pagos-ultimo-ano
 * Retorna pagos del propietario en el último año con detalles:
 * - Monto, fecha, periodo, estado, propiedad, inquilino
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
    // Obtener propiedades del propietario
    const { data: propiedades } = await admin
      .from("propiedades")
      .select("id, titulo, direccion")
      .eq("user_id", user.id)

    const propiedadIds = (propiedades ?? []).map((p: { id: string }) => p.id)

    if (propiedadIds.length === 0) {
      return NextResponse.json([])
    }

    // Obtener pagos del último año
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const oneYearAgoISO = oneYearAgo.toISOString()

    const { data: pagos, error } = await admin
      .from("pagos")
      .select(
        `
        id,
        monto,
        fecha_pago,
        periodo,
        estado,
        referencia_bancaria,
        propiedad_id,
        contrato_id,
        contratos (
          id,
          inquilino_id,
          inquilinos (
            id,
            nombre,
            email
          )
        )
      `
      )
      .in("propiedad_id", propiedadIds)
      .gte("fecha_pago", oneYearAgoISO)
      .order("fecha_pago", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mapear propiedades
    const propiedadesMap = new Map(
      (propiedades ?? []).map((p: { id: string; titulo: string; direccion: string }) => [
        p.id,
        { titulo: p.titulo, direccion: p.direccion },
      ])
    )

    // Enriquecer pagos con datos de propiedad
    const pagosEnriquecidos = (pagos ?? []).map(
      (pago: Record<string, unknown>) => ({
        ...pago,
        propiedad: propiedadesMap.get(pago.propiedad_id as string),
      })
    )

    return NextResponse.json(pagosEnriquecidos)
  } catch (err) {
    console.error("[GET /api/propietario/pagos-ultimo-ano]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
