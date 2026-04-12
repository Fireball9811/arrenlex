import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminRole } from "@/lib/auth/role"

/**
 * POST - Corrige el user_id de los contratos para que coincida con el propietario de la propiedad
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!(await isAdminRole(supabase, user.id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  try {
    // Obtener todos los contratos con sus propiedades
    const { data: contratos, error } = await admin
      .from("contratos")
      .select("id, user_id, propiedad_id, propiedades(user_id)")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("📋 Contratos encontrados:", contratos?.length || 0)

    const correcciones = []
    for (const contrato of contratos || []) {
      const propiedad = Array.isArray(contrato.propiedades) ? contrato.propiedades[0] : contrato.propiedades
      const propietarioId = propiedad?.user_id
      const contratoUserId = contrato.user_id

      // Si el user_id del contrato es diferente al user_id de la propiedad
      if (propietarioId && contratoUserId !== propietarioId) {
        console.log(`🔧 Corrigiendo contrato ${contrato.id}: user_id=${contratoUserId} -> ${propietarioId}`)

        const { error: updateError } = await admin
          .from("contratos")
          .update({ user_id: propietarioId })
          .eq("id", contrato.id)

        correcciones.push({
          contratoId: contrato.id,
          anterior: contratoUserId,
          nuevo: propietarioId,
          exitoso: !updateError,
          error: updateError?.message
        })
      }
    }

    return NextResponse.json({
      totalContratos: contratos?.length || 0,
      correccionesRealizadas: correcciones.length,
      detalles: correcciones
    })

  } catch (error: any) {
    console.error("❌ Error corrigiendo contratos:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
