import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Obtiene SOLO arrendatarios con contratos activos
 * Si tienen usuario en perfiles, se muestra su info
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
    // DEBUG: Primero ver TODOS los contratos y sus estados
    const { data: todosContratos, error: errorTodos } = await admin
      .from("contratos")
      .select("id, estado, arrendatario_id")

    console.log("🔍 [DEBUG] Todos los contratos:", JSON.stringify(todosContratos, null, 2))

    // Obtener arrendatarios con contratos activos o borrador (en proceso)
    const { data: contratosActivos, error: errorContratos } = await admin
      .from("contratos")
      .select(`
        id,
        arrendatario_id,
        arrendatarios!inner(id, nombre, cedula, email, celular),
        estado
      `)
      .in("estado", ["activo", "borrador"])

    console.log("✓ Contratos activos encontrados:", contratosActivos?.length || 0)
    console.log("✓ Datos de contratos:", JSON.stringify(contratosActivos, null, 2))

    if (errorContratos) {
      console.error("❌ Error obteniendo contratos activos:", errorContratos)
      return NextResponse.json({ error: errorContratos.message }, { status: 500 })
    }

    // Obtener emails de todos los arrendatarios con contrato activo
    // Manejar tanto si arrendatarios es array como si es objeto
    const emailsArrendatarios = contratosActivos
      ?.map(c => {
        const arrendatarios = c.arrendatarios
        const arrendatario = Array.isArray(arrendatarios) ? arrendatarios[0] : arrendatarios
        return arrendatario?.email ?? null
      })
      .filter(Boolean) || []

    // Buscar cuáles de estos arrendatarios ya tienen usuario
    let usuariosExistentes: any[] = []
    if (emailsArrendatarios.length > 0) {
      const { data: usuarios } = await admin
        .from("perfiles")
        .select("id, email, nombre, cedula, celular, role, activo, bloqueado")
        .in("email", emailsArrendatarios)
      usuariosExistentes = usuarios || []
    }

    // Crear mapa de usuarios por email para búsqueda rápida
    const usuariosPorEmail = new Map(usuariosExistentes.map(u => [u.email, u]))

    // Crear lista de inquilinos activos (solo los que tienen contrato)
    const inquilinosActivos: any[] = []

    for (const contrato of contratosActivos || []) {
      // Manejar tanto si arrendatarios es array como si es objeto
      const arrendatariosRaw = contrato.arrendatarios
      const arrendatario = Array.isArray(arrendatariosRaw) ? arrendatariosRaw[0] : arrendatariosRaw
      if (!arrendatario) continue

      const usuarioExistente = usuariosPorEmail.get(arrendatario.email)

      inquilinosActivos.push({
        // Si tiene usuario, usar sus datos, si no, usar datos del arrendatario
        id: usuarioExistente?.id || null,
        email: arrendatario.email,
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
