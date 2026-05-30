import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { requireAdminOrPropietarioRole } from "@/lib/auth/resource-access"

const ESTADOS_ACTIVOS = new Set(["activo", "borrador"])

/**
 * GET - Obtiene arrendatarios que NO tienen contrato activo/borrador en el alcance del usuario.
 * Admin: todos. Propietario: solo arrendatarios vinculados a contratos en sus propiedades.
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
  const denied = requireAdminOrPropietarioRole(role)
  if (denied) return denied

  const admin = createAdminClient()

  try {
    let arrendatarios: Array<{
      id: string
      nombre: string | null
      cedula: string | null
      email: string | null
      celular: string | null
      user_id: string | null
      created_at: string
      contratos: Array<{ id: string; estado: string; fecha_fin: string | null; propiedad_id?: string }>
    }> = []

    if (role === "admin") {
      const { data, error: errorArrendatarios } = await admin
        .from("arrendatarios")
        .select(`
          id,
          nombre,
          cedula,
          email,
          celular,
          user_id,
          created_at,
          contratos(id, estado, fecha_fin)
        `)

      if (errorArrendatarios) {
        console.error("[inquilinos-inactivos] Error arrendatarios:", errorArrendatarios)
        return NextResponse.json({ error: errorArrendatarios.message }, { status: 500 })
      }
      arrendatarios = (data ?? []) as typeof arrendatarios
    } else {
      const { data: props } = await admin
        .from("propiedades")
        .select("id")
        .eq("user_id", user.id)

      const propiedadIds = props?.map((p) => p.id) ?? []
      if (propiedadIds.length === 0) {
        return NextResponse.json([])
      }

      const { data: contratos, error: errorContratos } = await admin
        .from("contratos")
        .select(`
          arrendatario_id,
          estado,
          fecha_fin,
          propiedad_id,
          arrendatarios!inner(
            id,
            nombre,
            cedula,
            email,
            celular,
            user_id,
            created_at
          )
        `)
        .in("propiedad_id", propiedadIds)

      if (errorContratos) {
        console.error("[inquilinos-inactivos] Error contratos:", errorContratos)
        return NextResponse.json({ error: errorContratos.message }, { status: 500 })
      }

      const porArrendatario = new Map<string, typeof arrendatarios[number]>()

      for (const c of contratos ?? []) {
        const raw = c.arrendatarios
        const arr = (Array.isArray(raw) ? raw[0] : raw) as {
          id: string
          nombre: string | null
          cedula: string | null
          email: string | null
          celular: string | null
          user_id: string | null
          created_at: string
        } | null
        if (!arr?.id) continue

        const existing = porArrendatario.get(arr.id)
        const contratoRow = {
          id: "",
          estado: c.estado as string,
          fecha_fin: c.fecha_fin as string | null,
          propiedad_id: c.propiedad_id as string,
        }

        if (existing) {
          existing.contratos.push(contratoRow)
        } else {
          porArrendatario.set(arr.id, {
            ...arr,
            contratos: [contratoRow],
          })
        }
      }

      arrendatarios = [...porArrendatario.values()]
    }

    // Obtener información de usuarios por separado para los que tienen user_id
    const userIds = (arrendatarios || [])
      .map(a => a.user_id)
      .filter((id): id is string => id !== null && id !== undefined)

    const usuariosMap = new Map<string, { activo: boolean; bloqueado: boolean }>()

    if (userIds.length > 0) {
      const { data: usuarios } = await admin
        .from("perfiles")
        .select("id, activo, bloqueado")
        .in("id", userIds)

      if (usuarios) {
        for (const usuario of usuarios) {
          usuariosMap.set(usuario.id, {
            activo: usuario.activo ?? false,
            bloqueado: usuario.bloqueado ?? false
          })
        }
      }
    }

    const inquilinosInactivos = arrendatarios
      .filter((arrendatario) => {
        const contratos = arrendatario.contratos || []
        if (contratos.length === 0) return true
        const tieneContratoActivo = contratos.some((c) => ESTADOS_ACTIVOS.has(c.estado))
        return !tieneContratoActivo
      })
      .map(arrendatario => {
        const contratos = arrendatario.contratos || []
        const ultimoContrato = contratos.length > 0
          ? contratos.sort((a: any, b: any) =>
              new Date(b.fecha_fin || 0).getTime() - new Date(a.fecha_fin || 0).getTime()
            )[0]
          : null

        const userInfo = arrendatario.user_id ? usuariosMap.get(arrendatario.user_id) : null

        return {
          id: arrendatario.id,
          nombre: arrendatario.nombre,
          cedula: arrendatario.cedula,
          email: arrendatario.email,
          celular: arrendatario.celular,
          user_id: arrendatario.user_id,
          creado_en: arrendatario.created_at,
          tieneUsuario: !!arrendatario.user_id,
          tieneContrato: contratos.length > 0,
          estadoContrato: ultimoContrato?.estado || null,
          activo: userInfo?.activo ?? false,
          bloqueado: userInfo?.bloqueado ?? false,
        }
      })

    return NextResponse.json(inquilinosInactivos)

  } catch (error: any) {
    console.error("❌ Error obteniendo inquilinos inactivos:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener inquilinos inactivos" },
      { status: 500 }
    )
  }
}
