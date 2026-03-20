import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET - Obtiene arrendatarios que NO tienen contrato o que tienen contrato INACTIVO
 * Estados inactivos: terminado, vencido
 * Endpoint: /api/reportes/inquilinos-inactivos
 */
export async function GET() {
  console.log("🔵 [inquilinos-inactivos] GET iniciado")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // Obtener todos los arrendatarios con sus contratos
    const { data: arrendatariosConContratos, error: errorArrendatarios } = await admin
      .from("arrendatarios")
      .select(`
        id,
        nombre,
        cedula,
        email,
        celular,
        user_id,
        created_at,
        users!inner(activo, bloqueado),
        contratos(id, estado, fecha_fin)
      `)

    if (errorArrendatarios) {
      console.error("❌ Error obteniendo arrendatarios:", errorArrendatarios)
      return NextResponse.json({ error: errorArrendatarios.message }, { status: 500 })
    }

    // Estados activos de contrato
    const estadosActivos = new Set(["activo", "borrador"])

    // Filtrar inquilinos inactivos:
    // 1. No tienen contrato
    // 2. Solo tienen contratos inactivos (terminado, vencido, etc)
    const inquilinosInactivos = (arrendatariosConContratos || [])
      .filter(arrendatario => {
        const contratos = arrendatario.contratos || []
        if (contratos.length === 0) return true // Sin contrato
        // Verificar si tiene algún contrato activo
        const tieneContratoActivo = contratos.some((c: any) => estadosActivos.has(c.estado))
        return !tieneContratoActivo
      })
      .map(arrendatario => {
        const contratos = arrendatario.contratos || []
        const ultimoContrato = contratos.length > 0
          ? contratos.sort((a: any, b: any) =>
              new Date(b.fecha_fin || 0).getTime() - new Date(a.fecha_fin || 0).getTime()
            )[0]
          : null

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
          activo: (arrendatario as any).users?.activo ?? false,
          bloqueado: (arrendatario as any).users?.bloqueado ?? false,
        }
      })

    console.log("✓ Total inquilinos inactivos:", inquilinosInactivos.length)

    return NextResponse.json(inquilinosInactivos)

  } catch (error: any) {
    console.error("❌ Error obteniendo inquilinos inactivos:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener inquilinos inactivos" },
      { status: 500 }
    )
  }
}
