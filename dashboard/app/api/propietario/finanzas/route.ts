import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/propietario/finanzas
 * Retorna datos agregados para gráficas financieras del propietario
 * Query params:
 * - propiedadId: (opcional) ID de la propiedad para filtrar
 * - anios: (1-10) número de años atrás, default 1
 * - vista: 'mensual' | 'anual' - agrupación de datos, default 'mensual'
 */
export async function GET(request: Request) {
  console.log("[API Finanzas] Iniciando request...")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log("[API Finanzas] No autorizado - sin usuario")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  console.log("[API Finanzas] Usuario:", user.id, "Rol:", role)

  if (role !== "propietario") {
    return NextResponse.json(
      { error: "Solo propietarios pueden acceder a este recurso" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const propiedadId = searchParams.get("propiedadId")
  const aniosParam = searchParams.get("anios")
  const vista = searchParams.get("vista") || "mensual"

  console.log("[API Finanzas] Params:", { propiedadId, aniosParam, vista })

  // Validar y parsear parámetros
  let anios = 1
  if (aniosParam) {
    const parsed = parseInt(aniosParam, 10)
    if (isNaN(parsed) || parsed < 1 || parsed > 10) {
      return NextResponse.json(
        { error: "El parámetro 'anios' debe estar entre 1 y 10" },
        { status: 400 }
      )
    }
    anios = parsed
  }

  const admin = createAdminClient()

  try {
    // Obtener propiedades del propietario
    const { data: propiedades, error: propsError } = await admin
      .from("propiedades")
      .select("id, direccion, ciudad, barrio")
      .eq("user_id", user.id)

    if (propsError) throw propsError

    console.log("[API Finanzas] Propiedades encontradas:", propiedades?.length || 0)

    const propiedadIds = propiedades?.map((p) => p.id) ?? []
    const filteredPropiedadIds = propiedadId
      ? propiedadIds.filter((id) => id === propiedadId)
      : propiedadIds

    console.log("[API Finanzas] Propiedad IDs filtrados:", filteredPropiedadIds.length)

    if (filteredPropiedadIds.length === 0) {
      console.log("[API Finanzas] No hay propiedades después del filtro")
      return NextResponse.json({
        datos: [],
        ingresos: [],
        gastos: [],
        arrendatariosPorAno: [],
        totales: { ingresos: 0, gastos: 0, gananciaNeta: 0 },
      })
    }

    // Calcular fecha de inicio según número de años
    const fechaInicio = new Date()
    fechaInicio.setFullYear(fechaInicio.getFullYear() - anios)
    const fechaInicioISO = fechaInicio.toISOString()

    // ============================================
    // 1. INGRESOS por periodo (recibos_pago emitidos)
    // ============================================
    const { data: recibos, error: recibosError } = await admin
      .from("recibos_pago")
      .select("id, valor_arriendo, fecha_recibo, fecha_inicio_periodo, fecha_fin_periodo, estado, propiedad_id")
      .in("propiedad_id", filteredPropiedadIds)
      .gte("fecha_recibo", fechaInicioISO)
      .order("fecha_recibo", { ascending: true })

    if (recibosError) throw recibosError

    console.log("[API Finanzas] Recibos encontrados:", recibos?.length || 0)

    // Agrupar ingresos por periodo (usando fecha_recibo)
    const ingresosMap = new Map<string, number>()

    for (const recibo of recibos ?? []) {
      if (!recibo.fecha_recibo) continue

      const fecha = new Date(recibo.fecha_recibo)
      const clave = vista === "mensual"
        ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
        : String(fecha.getFullYear())

      ingresosMap.set(clave, (ingresosMap.get(clave) || 0) + (recibo.valor_arriendo || 0))
    }

    // ============================================
    // 2. GASTOS por periodo (mantenimiento_gestiones)
    // ============================================
    // Primero obtener los IDs de solicitudes de mantenimiento para estas propiedades
    const { data: solicitudes, error: solicitudesError } = await admin
      .from("solicitudes_mantenimiento")
      .select("id")
      .in("propiedad_id", filteredPropiedadIds)

    if (solicitudesError) throw solicitudesError

    const solicitudIds = solicitudes?.map((s) => s.id) ?? []

    // Obtener gestiones con sus costos
    let gastosMap = new Map<string, number>()

    if (solicitudIds.length > 0) {
      const { data: gestiones, error: gestionesError } = await admin
        .from("mantenimiento_gestiones")
        .select("costo, fecha_ejecucion")
        .in("solicitud_id", solicitudIds)
        .gte("fecha_ejecucion", fechaInicioISO.slice(0, 10))
        .order("fecha_ejecucion", { ascending: true })

      if (gestionesError) throw gestionesError

      for (const gestion of gestiones ?? []) {
        if (!gestion.fecha_ejecucion) continue

        const fecha = new Date(gestion.fecha_ejecucion)
        const clave = vista === "mensual"
          ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
          : String(fecha.getFullYear())

        gastosMap.set(clave, (gastosMap.get(clave) || 0) + (gestion.costo || 0))
      }
    }

    // ============================================
    // 3. CALCULAR TOTALES
    // ============================================
    const totalIngresos = Array.from(ingresosMap.values()).reduce((sum, val) => sum + val, 0)
    const totalGastos = Array.from(gastosMap.values()).reduce((sum, val) => sum + val, 0)

    // ============================================
    // 5. GENERAR RESPUESTA COMPLETA
    // ============================================
    // Generar todos los periodos en el rango
    const periodos: string[] = []
    const hoy = new Date()

    for (let i = 0; i < anios; i++) {
      const ano = hoy.getFullYear() - i
      if (vista === "anual") {
        periodos.push(String(ano))
      } else {
        // Mensual: agregar todos los meses del año
        for (let mes = 11; mes >= 0; mes--) {
          const fecha = new Date(ano, mes, 1)
          if (fecha <= hoy && fecha >= fechaInicio) {
            periodos.push(`${ano}-${String(mes + 1).padStart(2, "0")}`)
          }
        }
      }
    }

    periodos.reverse()

    // Nombres de meses para mostrar
    const meses = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ]

    const datosConNombre = periodos.map((periodo) => {
      let nombre = ""
      if (vista === "mensual") {
        const [ano, mes] = periodo.split("-")
        nombre = `${meses[parseInt(mes, 10) - 1]} ${ano}`
      } else {
        nombre = periodo
      }

      return {
        nombre,
        periodo,
        ingresos: ingresosMap.get(periodo) || 0,
        gastos: gastosMap.get(periodo) || 0,
        gananciaNeta: (ingresosMap.get(periodo) || 0) - (gastosMap.get(periodo) || 0),
      }
    })

    return NextResponse.json({
      datos: datosConNombre,
      arrendatariosPorAno: [],
      totales: {
        ingresos: totalIngresos,
        gastos: totalGastos,
        gananciaNeta: totalIngresos - totalGastos,
      },
      vista,
      anios,
    })

  } catch (err: any) {
    console.error("[GET /api/propietario/finanzas] ERROR:", err)
    console.error("[GET /api/propietario/finanzas] Error message:", err?.message)
    console.error("[GET /api/propietario/finanzas] Error stack:", err?.stack)

    return NextResponse.json(
      {
        error: err?.message || "Error desconocido",
        details: err?.stack || String(err)
      },
      { status: 500 }
    )
  }
}
