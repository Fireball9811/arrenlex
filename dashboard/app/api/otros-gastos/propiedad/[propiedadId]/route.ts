import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Obtiene todos los gastos de una propiedad específica
 * Incluye totales y está pensado para la vista de contabilidad por propiedad
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ propiedadId: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { propiedadId } = await params
  const admin = createAdminClient()

  // Primero verificar que la propiedad existe y el usuario tiene acceso
  const { data: propiedad, error: errProp } = await admin
    .from("propiedades")
    .select("id, user_id, direccion, ciudad, titulo")
    .eq("id", propiedadId)
    .single()

  if (errProp || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  if (role === "propietario" && propiedad.user_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // Obtener todos los gastos de la propiedad
  const { data: gastos, error: errGastos } = await admin
    .from("otros_gastos")
    .select(`
      id,
      nombre_completo,
      cedula,
      motivo_pago,
      descripcion_trabajo,
      fecha_realizacion,
      valor,
      banco,
      referencia_pago,
      numero_recibo,
      fecha_emision,
      estado,
      created_at
    `)
    .eq("propiedad_id", propiedadId)
    .order("fecha_emision", { ascending: false })

  if (errGastos) {
    console.error("[otros-gastos propiedad GET]", errGastos)
    return NextResponse.json({ error: "Error al obtener gastos" }, { status: 500 })
  }

  // Calcular totales
  const gastosArray = gastos ?? []
  const totalGastado = gastosArray.reduce((sum, g) => sum + (g.valor || 0), 0)

  // Agrupar por estado
  const porEstado = gastosArray.reduce((acc, g) => {
    const estado = g.estado || "pendiente"
    acc[estado] = (acc[estado] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({
    propiedad,
    gastos: gastosArray,
    resumen: {
      totalRegistros: gastosArray.length,
      totalGastado,
      porEstado,
    },
  })
}
