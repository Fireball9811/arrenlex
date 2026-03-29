import { NextResponse } from "next/server"

export async function GET(request: Request) {
  console.log("🔵 [propiedades] GET iniciado")
  
  try {
    // Primero verificar que el endpoint responde
    console.log("✓ Endpoint alcanzado")
    
    // Importar dinámicamente para evitar errores de compilación
    const { createClient } = await import("@/lib/supabase/server")
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const { getUserRole } = await import("@/lib/auth/role")
    
    console.log("✓ Módulos importados")

    const supabase = await createClient()
    console.log("✓ Cliente Supabase creado")
    
    const authData = await supabase.auth.getUser()
    const user = authData.data?.user
    
    console.log("✓ Usuario:", user?.id, user?.email)

    if (!user) {
      console.log("❌ No hay usuario autenticado")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener rol
    let role: string | null = null
    try {
      role = await getUserRole(supabase, user)
      console.log("✓ Rol obtenido:", role)
    } catch (err: any) {
      console.error("⚠️ Error en getUserRole, usando fallback:", err?.message)
      // Fallback: consultar perfiles directamente
      const { data: perfil, error: perfilErr } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("user_id", user.id)
        .single()
      
      if (perfilErr) {
        console.error("❌ Error consultando perfiles:", perfilErr?.message)
        return NextResponse.json({ error: "No se pudo obtener rol", details: perfilErr?.message }, { status: 500 })
      }
      
      role = perfil?.rol
      console.log("✓ Rol obtenido del fallback:", role)
    }
    
    if (!role || (role !== "admin" && role !== "propietario")) {
      console.log("❌ Rol no válido:", role)
      return NextResponse.json({ error: "No tienes permiso", your_role: role }, { status: 403 })
    }

    // Crear admin client y ejecutar query
    const admin = createAdminClient()
    console.log("✓ Admin client creado")

    let query = admin.from("propiedades").select("*")

    if (role === "propietario") {
      query = query.eq("user_id", user.id)
      console.log("✓ Query: propiedades where user_id =", user.id)
    } else {
      console.log("✓ Query: todas las propiedades (admin)")
    }

    // NO filtrar por estado - el propietario debe ver TODAS sus propiedades
    // query = query.eq("estado", "disponible")

    query = query.order("created_at", { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("❌ Error en query:", error?.message, error?.code)
      return NextResponse.json(
        { error: "Error en consulta", details: error?.message, code: error?.code }, 
        { status: 500 }
      )
    }

    console.log("✓ SUCCESS! Retornando", data?.length || 0, "propiedades")
    return NextResponse.json(data ?? [])
    
  } catch (err: any) {
    console.error("❌ ERROR GENERAL:", err?.message || err)
    console.error(err)
    return NextResponse.json(
      { error: "Error interno del servidor", details: err?.message },
      { status: 500 }
    )
  }
}

// POST - Crear nueva propiedad con matrícula automática
export async function POST(request: Request) {
  console.log("🟢 [propiedades] POST - Crear propiedad")

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const { getUserRole } = await import("@/lib/auth/role")

    const supabase = await createClient()
    const authData = await supabase.auth.getUser()
    const user = authData.data?.user

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = await getUserRole(supabase, user)
    if (role !== "admin" && role !== "propietario") {
      return NextResponse.json({ error: "No tienes permiso" }, { status: 403 })
    }

    const body = await request.json()

    // Validar campos requeridos
    if (!body.direccion || !body.ciudad) {
      return NextResponse.json(
        { error: "Dirección y ciudad son obligatorios" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Generar número de matrícula automático usando la función de PostgreSQL
    const { data: matriculaData } = await admin.rpc("generar_numero_matricula")

    if (!matriculaData) {
      return NextResponse.json(
        { error: "Error al generar número de matrícula" },
        { status: 500 }
      )
    }

    const numeroMatricula = matriculaData

    // Crear propiedad
    const { data, error } = await admin
      .from("propiedades")
      .insert({
        user_id: role === "propietario" ? user.id : body.user_id || user.id,
        titulo: body.titulo || null,
        direccion: body.direccion,
        ciudad: body.ciudad,
        barrio: body.barrio || null,
        tipo: body.tipo || "apartamento",
        habitaciones: Number(body.habitaciones) || 0,
        banos: Number(body.banos) || 0,
        area: Number(body.area) || 0,
        ascensor: Number(body.ascensor) || 0,
        depositos: Number(body.depositos) || 0,
        parqueaderos: Number(body.parqueaderos) || 0,
        valor_arriendo: Number(body.valor_arriendo) || 0,
        descripcion: body.descripcion || null,
        estado: body.estado || "disponible",
        matricula_inmobiliaria: body.matricula_inmobiliaria || null,
        numero_matricula: numeroMatricula,
        cuenta_bancaria_entidad: body.cuenta_bancaria_entidad || null,
        cuenta_bancaria_tipo: body.cuenta_bancaria_tipo || null,
        cuenta_bancaria_numero: body.cuenta_bancaria_numero || null,
        cuenta_bancaria_titular: body.cuenta_bancaria_titular || null,
        valor_inmueble: body.valor_inmueble ? Number(body.valor_inmueble) : null,
        gastos_operativos: body.gastos_operativos ? Number(body.gastos_operativos) : null,
        cap: body.cap ? Number(body.cap) : null,
        grm: body.grm ? Number(body.grm) : null,
        cuota_mensual: body.cuota_mensual ? Number(body.cuota_mensual) : null,
        intereses_anuales: body.intereses_anuales ? Number(body.intereses_anuales) : null,
        cash_on_cash: body.cash_on_cash ? Number(body.cash_on_cash) : null,
        ber: body.ber ? Number(body.ber) : null,
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Error creando propiedad:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log("✓ Propiedad creada con matrícula:", numeroMatricula)
    return NextResponse.json(data)

  } catch (err: any) {
    console.error("❌ ERROR GENERAL:", err?.message || err)
    return NextResponse.json(
      { error: "Error interno del servidor", details: err?.message },
      { status: 500 }
    )
  }
}
