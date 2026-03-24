import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/propietario/pendientes-mes
 * Retorna las propiedades con contratos activos que no tienen recibo en el mes actual.
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
  if (role !== "propietario" && role !== "admin") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Calcular primer y último día del mes actual
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth() + 1
  const primerDia = `${anio}-${String(mes).padStart(2, "0")}-01`
  const ultimoDia = new Date(anio, mes, 0).toISOString().split("T")[0]

  // Obtener contratos activos del propietario con info de propiedad y arrendatario
  const queryContratos =
    role === "propietario"
      ? admin
          .from("contratos")
          .select(`
            id,
            propiedad_id,
            arrendatario_id,
            propiedad:propiedades(id, direccion, ciudad, barrio, valor_arriendo),
            arrendatario:arrendatarios(id, nombre, celular, email)
          `)
          .eq("user_id", user.id)
          .eq("estado", "activo")
      : admin
          .from("contratos")
          .select(`
            id,
            propiedad_id,
            arrendatario_id,
            user_id,
            propiedad:propiedades(id, direccion, ciudad, barrio, valor_arriendo),
            arrendatario:arrendatarios(id, nombre, celular, email)
          `)
          .eq("estado", "activo")

  const { data: contratos, error: errorContratos } = await queryContratos

  if (errorContratos) {
    console.error("[pendientes-mes] Error contratos:", errorContratos)
    return NextResponse.json({ error: errorContratos.message }, { status: 500 })
  }

  if (!contratos || contratos.length === 0) {
    return NextResponse.json({ pendientes: [], mes: `${anio}-${String(mes).padStart(2, "0")}` })
  }

  // Obtener recibos del mes actual para el propietario
  const reciboQuery =
    role === "propietario"
      ? admin
          .from("recibos_pago")
          .select("id, propiedad_id")
          .eq("user_id", user.id)
          .gte("fecha_recibo", primerDia)
          .lte("fecha_recibo", ultimoDia)
      : admin
          .from("recibos_pago")
          .select("id, propiedad_id")
          .gte("fecha_recibo", primerDia)
          .lte("fecha_recibo", ultimoDia)

  const { data: recibosMes, error: errorRecibos } = await reciboQuery

  if (errorRecibos) {
    console.error("[pendientes-mes] Error recibos:", errorRecibos)
    return NextResponse.json({ error: errorRecibos.message }, { status: 500 })
  }

  // Propiedades que ya tienen recibo este mes
  const propiedadesPagadas = new Set((recibosMes ?? []).map((r) => r.propiedad_id))

  // Filtrar contratos cuya propiedad no tiene recibo este mes
  const pendientes = contratos
    .filter((c) => !propiedadesPagadas.has(c.propiedad_id))
    .map((c) => {
      const prop = Array.isArray(c.propiedad) ? c.propiedad[0] : c.propiedad
      const arr = Array.isArray(c.arrendatario) ? c.arrendatario[0] : c.arrendatario
      return {
        contrato_id: c.id,
        propiedad: prop
          ? {
              id: prop.id,
              direccion: prop.direccion,
              ciudad: prop.ciudad ?? "",
              barrio: prop.barrio ?? "",
              valor_arriendo: Number(prop.valor_arriendo ?? 0),
            }
          : null,
        arrendatario: arr
          ? {
              id: arr.id,
              nombre: arr.nombre,
              celular: arr.celular ?? "",
              email: arr.email ?? "",
            }
          : null,
      }
    })

  return NextResponse.json({
    pendientes,
    mes: `${anio}-${String(mes).padStart(2, "0")}`,
    primer_dia: primerDia,
    ultimo_dia: ultimoDia,
  })
}
