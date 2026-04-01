import { NextResponse } from "next/server"

/**
 * DEBUG endpoint - deshabilitado en producción
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { createClient } = await import("@/lib/supabase/server")
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { getUserRole } = await import("@/lib/auth/role")

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado - inicia sesión primero" }, { status: 401 })
    }

    const role = await getUserRole(supabase, user)
    const admin = createAdminClient()

    const { data: perfil, error: errorPerfil } = await admin
      .from("perfiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const { data: porPropietarioId, error: errorPropietarioId, count: countPropietarioId } = await admin
      .from("propiedades")
      .select("id, titulo, propietario_id, user_id, ciudad", { count: "exact" })
      .eq("propietario_id", user.id)

    const { data: porUserId, error: errorUserId, count: countUserId } = await admin
      .from("propiedades")
      .select("id, titulo, propietario_id, user_id, ciudad", { count: "exact" })
      .eq("user_id", user.id)

    const { data: ejemplos, error: errorEjemplos } = await admin
      .from("propiedades")
      .select("*")
      .limit(2)

    const debug = {
      usuario: {
        id: user.id,
        email: user.email,
        rol: role,
      },
      perfil: {
        encontrado: !!perfil,
        datos: perfil ? {
          user_id: perfil.user_id,
          nombre: perfil.nombre,
          rol: perfil.rol,
        } : null,
        error: errorPerfil?.message,
      },
      propiedades: {
        porPropietarioId: {
          count: countPropietarioId || porPropietarioId?.length || 0,
          datos: porPropietarioId?.slice(0, 3) || [],
          error: errorPropietarioId?.message,
        },
        porUserId: {
          count: countUserId || porUserId?.length || 0,
          datos: porUserId?.slice(0, 3) || [],
          error: errorUserId?.message,
        },
      },
      ejemploDatos: {
        estructuraTabla: ejemplos?.length ? ejemplos.map(p => ({
          id: p.id,
          titulo: p.titulo,
          propietario_id: p.propietario_id,
          user_id: p.user_id,
        })) : null,
        error: errorEjemplos?.message,
      },
      diagnostico: {
        tienePropioedaresConPropietarioId: (porPropietarioId?.length || 0) > 0,
        tienePropioedaresConUserId: (porUserId?.length || 0) > 0,
        recomendacion: porPropietarioId?.length ?
          "✅ Usa propietario_id para filtrar" :
          porUserId?.length ?
          "✅ Usa user_id para filtrar" :
          "❌ No hay propiedades asignadas a este usuario",
      }
    }

    return NextResponse.json(debug)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Error desconocido",
    }, { status: 500 })
  }
}
