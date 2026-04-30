import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { fechasPeriodoRecibo } from "@/lib/utils/recibo-periodo"

/**
 * GET /api/recibos-pago
 * Obtiene los recibos de pago del propietario
 * Admin: puede ver todos los recibos
 * Propietario: solo sus propios recibos
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
  console.log("🔵 [GET /api/recibos-pago] Rol:", role, "User ID:", user.id)

  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json(
      { error: "No tienes permiso para ver recibos" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const propiedadId = searchParams.get("propiedad_id")

  console.log("📍 propiedad_id:", propiedadId)

  const admin = createAdminClient()

  let query = admin
    .from("recibos_pago")
    .select(`
      *,
      propiedad:propiedades(id, direccion, ciudad, barrio, numero_matricula, user_id)
    `)
    .order("fecha_recibo", { ascending: false })

  if (propiedadId) {
    query = query.eq("propiedad_id", propiedadId)
  }

  const { data: allData, error } = await query

  console.log("📊 Recibos encontrados (crudos):", allData?.length || 0)

  if (error) {
    console.error("Error fetching recibos:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Si es propietario, filtrar por propiedades que les pertenecen
  let filteredData = allData ?? []
  if (role === "propietario") {
    filteredData = (allData ?? []).filter((r: any) => {
      const propiedad = r.propiedad as any
      const tienePermiso = propiedad && propiedad.user_id === user.id
      if (!tienePermiso && r) {
        console.log("⚠️ Recibo sin permiso:", {
          reciboId: r.id,
          propiedadId: r.propiedad_id,
          propiedadUserId: propiedad?.user_id,
          userId: user.id,
        })
      }
      return tienePermiso
    })
  }

  console.log("✅ Recibos después de filtro:", filteredData.length)

  return NextResponse.json(filteredData)
}

/**
 * POST /api/recibos-pago
 * Crea un nuevo recibo de pago
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json(
      { error: "No tienes permiso para crear recibos" },
      { status: 403 }
    )
  }

  const body = await request.json()

  const admin = createAdminClient()

  // Obtener numero_matricula de la propiedad
  const { data: propiedadData } = await admin
    .from("propiedades")
    .select("id, numero_matricula")
    .eq("id", body.propiedad_id)
    .single()

  if (!propiedadData) {
    return NextResponse.json(
      { error: "Propiedad no encontrada" },
      { status: 404 }
    )
  }

  // Verificar que la propiedad pertenece al usuario
  if (role === "propietario") {
    const { data: propiedadOwner, error: propError } = await admin
      .from("propiedades")
      .select("id")
      .eq("id", body.propiedad_id)
      .eq("user_id", user.id)
      .single()

    if (propError || !propiedadOwner) {
      return NextResponse.json(
        { error: "No tienes permiso para crear recibos para esta propiedad" },
        { status: 403 }
      )
    }
  }

  const periodo = fechasPeriodoRecibo(
    body.tipo_pago,
    body.fecha_inicio_periodo,
    body.fecha_fin_periodo
  )
  if (!periodo.ok) {
    return NextResponse.json({ error: periodo.error }, { status: 400 })
  }

  // NO enviar numero_recibo - se autogenera en la base de datos
  const { data, error } = await admin
    .from("recibos_pago")
    .insert({
      propiedad_id: body.propiedad_id,
      user_id: user.id,
      arrendador_nombre: body.arrendador_nombre,
      arrendador_cedula: body.arrendador_cedula,
      propietario_nombre: body.propietario_nombre,
      propietario_cedula: body.propietario_cedula,
      valor_arriendo: body.valor_arriendo,
      valor_arriendo_letras: body.valor_arriendo_letras,
      fecha_inicio_periodo: periodo.fecha_inicio_periodo,
      fecha_fin_periodo: periodo.fecha_fin_periodo,
      tipo_pago: body.tipo_pago ?? "arriendo",
      fecha_recibo: body.fecha_recibo,
      // numero_recibo se autogenera
      cuenta_consignacion: body.cuenta_consignacion,
      referencia_pago: body.referencia_pago,
      nota: body.nota,
      estado: "borrador",
      numero_matricula: propiedadData.numero_matricula,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating recibo:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
