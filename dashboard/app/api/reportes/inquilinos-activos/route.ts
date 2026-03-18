import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Obtiene TODOS los arrendatarios con contratos activos o borrador
 * Si tienen usuario en perfiles (por email o por user_id), se muestra su info
 * Si no tienen usuario, se marcan para que se les cree uno
 */
export async function GET() {
  console.log("🔵 [inquilinos-activos] GET iniciado")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // Obtener arrendatarios con contratos activos o borrador (en proceso)
    const { data: contratosActivos, error: errorContratos } = await admin
      .from("contratos")
      .select(`
        id,
        arrendatario_id,
        arrendatarios!inner(id, nombre, cedula, email, celular, user_id),
        estado
      `)
      .in("estado", ["activo", "borrador"])

    console.log("✓ Contratos activos/borrador encontrados:", contratosActivos?.length || 0)

    if (errorContratos) {
      console.error("❌ Error obteniendo contratos activos:", errorContratos)
      return NextResponse.json({ error: errorContratos.message }, { status: 500 })
    }

    // Recopilar todos los emails y user_ids de los arrendatarios
    const emailsArrendatarios: string[] = []
    const userIds: string[] = []

    for (const c of contratosActivos || []) {
      const arrendatariosRaw = c.arrendatarios
      const arrendatario = Array.isArray(arrendatariosRaw) ? arrendatariosRaw[0] : arrendatariosRaw
      if (!arrendatario) continue

      if (arrendatario.email) {
        emailsArrendatarios.push(arrendatario.email)
      }
      if (arrendatario.user_id) {
        userIds.push(arrendatario.user_id)
      }
    }

    // Buscar usuarios por email
    let usuariosPorEmail: Map<string, any> = new Map()
    if (emailsArrendatarios.length > 0) {
      const { data: usuariosByEmail } = await admin
        .from("perfiles")
        .select("id, email, nombre, cedula, celular, role, activo, bloqueado")
        .in("email", emailsArrendatarios)

      if (usuariosByEmail) {
        usuariosPorEmail = new Map(usuariosByEmail.map(u => [u.email, u]))
      }
    }

    // Buscar usuarios por user_id (para arrendatarios que ya están vinculados)
    let usuariosPorUserId: Map<string, any> = new Map()
    if (userIds.length > 0) {
      const { data: usuariosById } = await admin
        .from("perfiles")
        .select("id, email, nombre, cedula, celular, role, activo, bloqueado")
        .in("id", userIds)

      if (usuariosById) {
        usuariosPorUserId = new Map(usuariosById.map(u => [u.id, u]))
      }
    }

    // Crear lista de inquilinos activos
    const inquilinosActivos: any[] = []

    for (const contrato of contratosActivos || []) {
      const arrendatariosRaw = contrato.arrendatarios
      const arrendatario = Array.isArray(arrendatariosRaw) ? arrendatariosRaw[0] : arrendatariosRaw
      if (!arrendatario) continue

      // Buscar usuario primero por user_id (vinculado), luego por email
      let usuarioExistente = arrendatario.user_id ? usuariosPorUserId.get(arrendatario.user_id) : null
      if (!usuarioExistente && arrendatario.email) {
        usuarioExistente = usuariosPorEmail.get(arrendatario.email)
      }

      inquilinosActivos.push({
        // Si tiene usuario, usar sus datos, si no, usar datos del arrendatario
        id: usuarioExistente?.id || null,
        email: arrendatario.email || usuarioExistente?.email || null,
        nombre: arrendatario.nombre,
        cedula: arrendatario.cedula,
        celular: arrendatario.celular,
        role: usuarioExistente?.role || null,
        activo: usuarioExistente?.activo ?? false,
        bloqueado: usuarioExistente?.bloqueado ?? false,
        // Campos adicionales para el frontend
        tieneUsuario: !!usuarioExistente,
        tieneContratoActivo: true,
        arrendatarioId: arrendatario.id,
        contratoId: contrato.id,
        contratoEstado: contrato.estado,
      })
    }

    console.log("✓ Total inquilinos activos (con contrato):", inquilinosActivos.length)

    return NextResponse.json(inquilinosActivos)

  } catch (error: any) {
    console.error("❌ Error obteniendo inquilinos activos:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener inquilinos activos" },
      { status: 500 }
    )
  }
}
