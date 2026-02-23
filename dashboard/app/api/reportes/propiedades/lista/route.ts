import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/supabase/admin"

/**
 * API para obtener listado de propiedades con información de propietario
 * Endpoint: /api/reportes/propiedades/lista?filtro=todos|disponibles|arrendadas|mantenimiento
 */
export async function GET(request: Request) {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Solo administradores pueden ver el listado" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const filtro = searchParams.get("filtro") || "todos"

  try {
    let query = admin
      .from("propiedades")
      .select("*")
      .order("created_at", { ascending: false })

    // Aplicar filtro si no es "todos"
    if (filtro !== "todos") {
      // Mapear filtros a estados en la base de datos
      const filtroMap: Record<string, string> = {
        disponibles: "disponible",
        arrendadas: "arrendado",
        mantenimiento: "mantenimiento",
        pendientes: "pendiente"
      }
      const estado = filtroMap[filtro] || filtro
      query = query.eq("estado", estado)
    }

    const { data: propiedades, error: errProps } = await query

    if (errProps) {
      console.error("[api/reportes/propiedades/lista] Error obteniendo propiedades:", errProps)
      return NextResponse.json({ error: "Error al obtener propiedades" }, { status: 500 })
    }

    // Obtener IDs de propietarios únicos
    const userIds = [...new Set((propiedades || []).map((p) => p.user_id))]

    // Obtener datos de propietarios
    const { data: perfiles, error: errPerfiles } = await admin
      .from("perfiles")
      .select("id, nombre, email")
      .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])

    if (errPerfiles) {
      console.error("[api/reportes/propiedades/lista] Error obteniendo perfiles:", errPerfiles)
    }

    const perfilesMap = new Map(
      (perfiles || []).map((p) => [p.id, p])
    )

    // Combinar datos
    const conPropietario = (propiedades || []).map((p) => ({
      ...p,
      propietario: perfilesMap.get(p.user_id) || null
    }))

    return NextResponse.json(conPropietario)
  } catch (error) {
    console.error("[api/reportes/propiedades/lista] Error:", error)
    return NextResponse.json(
      { error: "Error al obtener listado de propiedades" },
      { status: 500 }
    )
  }
}
