import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/propietario/historial-recibos
 * Retorna los recibos del propietario agrupados por arrendatario.
 * Query params: fecha_inicio (YYYY-MM-DD), fecha_fin (YYYY-MM-DD)
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
  if (role !== "propietario" && role !== "admin") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const fechaInicio = searchParams.get("fecha_inicio")
  const fechaFin = searchParams.get("fecha_fin")

  const admin = createAdminClient()

  let query = admin
    .from("recibos_pago")
    .select(`
      id,
      numero_recibo,
      arrendador_nombre,
      arrendador_cedula,
      valor_arriendo,
      fecha_recibo,
      fecha_inicio_periodo,
      fecha_fin_periodo,
      tipo_pago,
      estado,
      referencia_pago,
      propiedad:propiedades(id, direccion, ciudad, barrio)
    `)
    .order("fecha_recibo", { ascending: false })

  if (role === "propietario") {
    query = query.eq("user_id", user.id)
  }

  if (fechaInicio) {
    query = query.gte("fecha_recibo", fechaInicio)
  }

  if (fechaFin) {
    query = query.lte("fecha_recibo", fechaFin)
  }

  const { data, error } = await query

  if (error) {
    console.error("[historial-recibos] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const recibos = data ?? []

  // Agrupar por arrendatario
  const mapaArrendatarios = new Map<
    string,
    {
      arrendador_nombre: string
      arrendador_cedula: string
      total: number
      recibos: typeof recibos
    }
  >()

  for (const recibo of recibos) {
    const nombre = recibo.arrendador_nombre ?? "Sin nombre"
    const cedula = recibo.arrendador_cedula ?? ""
    const key = `${nombre}__${cedula}`

    if (!mapaArrendatarios.has(key)) {
      mapaArrendatarios.set(key, {
        arrendador_nombre: nombre,
        arrendador_cedula: cedula,
        total: 0,
        recibos: [],
      })
    }

    const entry = mapaArrendatarios.get(key)!
    entry.total += Number(recibo.valor_arriendo ?? 0)
    entry.recibos.push(recibo)
  }

  const resultado = Array.from(mapaArrendatarios.values()).sort((a, b) =>
    a.arrendador_nombre.localeCompare(b.arrendador_nombre)
  )

  return NextResponse.json({
    grupos: resultado,
    total_general: resultado.reduce((sum, g) => sum + g.total, 0),
    total_recibos: recibos.length,
  })
}
