import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/propietario/finanzas-test
 * Test endpoint para depurar
 */
export async function GET(request: Request) {
  console.log("[API Finanzas Test] Iniciando...")

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log("[API Finanzas Test] No autorizado")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("[API Finanzas Test] Usuario:", user.id)

    const admin = createAdminClient()

    // Test 1: Obtener propiedades
    console.log("[API Finanzas Test] Obteniendo propiedades...")
    const { data: propiedades, error: propsError } = await admin
      .from("propiedades")
      .select("id, direccion, ciudad")
      .eq("user_id", user.id)
      .limit(1)

    if (propsError) {
      console.error("[API Finanzas Test] Error propiedades:", propsError)
      throw propsError
    }

    console.log("[API Finanzas Test] Propiedades:", propiedades?.length || 0)

    // Test 2: Obtener contratos
    if (propiedades && propiedades.length > 0) {
      const propId = propiedades[0].id
      console.log("[API Finanzas Test] Obteniendo contratos de propiedad:", propId)

      const { data: contratos, error: contratosError } = await admin
        .from("contratos")
        .select("id, arrendatario_id, fecha_inicio")
        .eq("propiedad_id", propId)
        .limit(5)

      if (contratosError) {
        console.error("[API Finanzas Test] Error contratos:", contratosError)
        throw contratosError
      }

      console.log("[API Finanzas Test] Contratos:", contratos?.length || 0)

      // Test 3: Obtener pagos
      if (contratos && contratos.length > 0) {
        const contratoIds = contratos.map(c => c.id)
        console.log("[API Finanzas Test] Obteniendo pagos de contratos:", contratoIds)

        const { data: pagos, error: pagosError } = await admin
          .from("pagos")
          .select("id, monto, fecha_pago, estado")
          .in("contrato_id", contratoIds)
          .limit(5)

        if (pagosError) {
          console.error("[API Finanzas Test] Error pagos:", pagosError)
          throw pagosError
        }

        console.log("[API Finanzas Test] Pagos:", pagos?.length || 0)
        return NextResponse.json({
          success: true,
          propiedades: propiedades?.length || 0,
          contratos: contratos?.length || 0,
          pagos: pagos?.length || 0,
          testData: { propiedades, contratos, pagos }
        })
      }

      return NextResponse.json({
        success: true,
        propiedades: propiedades?.length || 0,
        contratos: contratos?.length || 0,
        pagos: 0,
        message: "No hay contratos para buscar pagos"
      })
    }

    return NextResponse.json({
      success: true,
      propiedades: 0,
      message: "No hay propiedades"
    })

  } catch (err: any) {
    console.error("[API Finanzas Test] ERROR:", err)
    return NextResponse.json(
      {
        error: err?.message || "Error desconocido",
        stack: err?.stack || "",
        details: String(err)
      },
      { status: 500 }
    )
  }
}
