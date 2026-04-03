import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { handleSupabaseError, handleApiError } from "@/lib/api-error"

// GET - Listar contratos del usuario
export async function GET(request: Request) {
  console.log("🔵 [contratos] GET lista iniciado")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("❌ No hay usuario autenticado")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  console.log("✓ Usuario:", user.id, user.email)

  const { searchParams } = new URL(request.url)
  const estado = searchParams.get("estado")
  const propiedadId = searchParams.get("propiedad_id")
  const userIdFiltro = searchParams.get("user_id") // Filtro por propietario (admin)

  // Obtener el rol del usuario
  let role: string | null = null
  try {
    role = await getUserRole(supabase, user)
    console.log("✓ Rol obtenido:", role)
  } catch (err: any) {
    console.error("⚠️ Error obteniendo rol:", err?.message)
  }

  // Usar admin client para evitar problemas con RLS
  const admin = createAdminClient()

  let query = admin
    .from("contratos")
    .select(`
      *,
      propiedad:propiedades(
        id, direccion, ciudad, barrio, valor_arriendo, user_id
      ),
      arrendatario:arrendatarios(
        id, nombre, cedula, email, celular
      )
    `)

  // El admin ve todos los contratos, el propietario solo los suyos
  if (role !== "admin") {
    query = query.eq("user_id", user.id)
    console.log("✓ Filtrando por user_id del propietario:", user.id)
  } else {
    // Si es admin y especificó un user_id, filtrar por ese propietario
    if (userIdFiltro) {
      query = query.eq("user_id", userIdFiltro)
      console.log("✓ Admin: filtrando por user_id del propietario:", userIdFiltro)
    } else {
      console.log("✓ Admin: mostrando todos los contratos")
    }
  }

  query = query.order("created_at", { ascending: false })

  if (estado) {
    query = query.eq("estado", estado)
  }

  if (propiedadId) {
    query = query.eq("propiedad_id", propiedadId)
  }

  const { data, error } = await query

  if (error) {
    console.error("❌ Error en query:", error)
    return handleSupabaseError("contratos GET", error)
  }

  console.log("✓ Contratos encontrados:", data?.length || 0)

  // Obtener información de propietarios para cada contrato
  const contratosConPropietario = await Promise.all(
    (data ?? []).map(async (contrato) => {
      if (contrato.propiedad?.user_id) {
        const { data: propietario } = await admin
          .from("perfiles")
          .select("id, email, nombre")
          .eq("id", contrato.propiedad.user_id)
          .single()

        return { ...contrato, propietario }
      }
      return contrato
    })
  )

  console.log("✓ Retornando contratos con propietarios")
  return NextResponse.json(contratosConPropietario)
}

// POST - Crear nuevo contrato
export async function POST(request: Request) {
  console.log("🔵 [contratos] POST iniciado")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("❌ No hay usuario autenticado")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  console.log("✓ Usuario:", user.id, user.email)

  const body = await request.json()
  console.log("✓ Body recibido:", { propiedad_id: body.propiedad_id, arrendatario_id: body.arrendatario_id })

  // Validar campos requeridos
  if (!body.propiedad_id || !body.arrendatario_id || !body.fecha_inicio || !body.ciudad_firma) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: propiedad_id, arrendatario_id, fecha_inicio, ciudad_firma" },
      { status: 400 }
    )
  }

  // Obtener el rol del usuario
  let role: string | null = null
  try {
    role = await getUserRole(supabase, user)
    console.log("✓ Rol obtenido:", role)
  } catch (err: any) {
    console.error("⚠️ Error obteniendo rol:", err?.message)
  }

  // Obtener valor de arriendo de la propiedad usando admin client
  const admin = createAdminClient()
  console.log("✓ Buscando propiedad:", body.propiedad_id, "para usuario:", user.id, "con rol:", role)

  // Construir la query según el rol
  let query = admin
    .from("propiedades")
    .select("id, valor_arriendo, user_id, direccion, estado")
    .eq("id", body.propiedad_id)

  // Si es propietario, verificar que la propiedad le pertenezca. Si es admin, puede adjudicar cualquiera.
  if (role === "propietario") {
    query = query.eq("user_id", user.id)
    console.log("✓ Query: propiedad where user_id =", user.id)
  } else {
    console.log("✓ Query: admin puede adjudicar cualquier propiedad")
  }

  const { data: propiedad, error: propError } = await query

  console.log("✓ Resultado búsqueda propiedad:", { found: !!propiedad && propiedad.length > 0, count: propiedad?.length, error: propError?.message })

  if (!propiedad || propiedad.length === 0) {
    console.log("❌ Propiedad no encontrada.")
    // Para admin, buscar todas las propiedades disponibles
    if (role === "admin") {
      const { data: allProps } = await admin
        .from("propiedades")
        .select("id, direccion, estado")
        .eq("estado", "disponible")
      console.log("✓ Propiedades disponibles:", allProps?.map(p => ({ id: p.id, direccion: p.direccion })))
    } else {
      const { data: allProps } = await admin
        .from("propiedades")
        .select("id, direccion, estado")
        .eq("user_id", user.id)
      console.log("✓ Propiedades del usuario:", allProps?.map(p => ({ id: p.id, direccion: p.direccion, estado: p.estado })))
    }

    return NextResponse.json(
      { error: "Propiedad no encontrada. Verifica que la propiedad exista y esté disponible." },
      { status: 404 }
    )
  }

  const prop = propiedad[0]

  // Crear el contrato
  console.log("✓ Insertando contrato...")

  // El user_id del contrato debe ser el del propietario de la propiedad
  // para que el propietario pueda ver y gestionar sus contratos
  const contratoUserId = prop.user_id

  console.log("✓ Contrato se asociará al usuario (propietario):", contratoUserId)

  // Usar admin client para insertar el contrato porque:
  // 1. Si el admin está creando el contrato, el user_id es del propietario (diferente al admin)
  // 2. Las políticas RLS bloquearían la inserción con user_id diferente
  const { data, error } = await admin
    .from("contratos")
    .insert({
      user_id: contratoUserId, // ID del propietario de la propiedad
      propiedad_id: body.propiedad_id,
      arrendatario_id: body.arrendatario_id,
      fecha_inicio: body.fecha_inicio,
      duracion_meses: Number(body.duracion_meses) || 12,
      canon_mensual: Number(body.canon_mensual) || Number(prop.valor_arriendo) || 0,
      ciudad_firma: body.ciudad_firma,
      estado: body.estado || "borrador",
    })
    .select(`
      *,
      propiedad:propiedades(
        id, direccion, ciudad, barrio, valor_arriendo, user_id
      ),
      arrendatario:arrendatarios(*)
    `)
    .single()

  if (error) {
    console.error("❌ Error insertando contrato:", error.message, error.details, error.hint)
    return handleSupabaseError("contratos POST", error)
  }

  console.log("✓ Contrato creado exitosamente:", data?.id)

  // Actualizar el estado de la propiedad a "arrendado"
  console.log("✓ Actualizando estado de la propiedad a arrendado...")
  const { error: updateError } = await admin
    .from("propiedades")
    .update({ estado: "arrendado" })
    .eq("id", body.propiedad_id)

  if (updateError) {
    console.error("⚠️ Error actualizando estado de propiedad:", updateError.message)
    // No fallamos el proceso si no se puede actualizar la propiedad
    // El contrato ya está creado
  } else {
    console.log("✓ Propiedad marcada como arrendada")
  }

  // Obtener información del propietario (arrendador) desde perfiles
  if (data?.propiedad?.user_id) {
    const { data: propietario } = await admin
      .from("perfiles")
      .select("id, email, nombre")
      .eq("id", data.propiedad.user_id)
      .single()

    if (propietario) {
      data.propietario = propietario
    }
  }

  return NextResponse.json(data)
}
