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
