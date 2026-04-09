import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import * as XLSX from "xlsx"

/**
 * GET /api/propietario/exportar/datos
 * Exporta datos de arrendatarios y gastos de mantenimiento a Excel
 * Query params:
 * - propiedadId: (opcional) ID de la propiedad para filtrar
 * - anios: (1-10) número de años atrás, default 1
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "propietario") {
    return NextResponse.json(
      { error: "Solo propietarios pueden acceder a este recurso" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const propiedadId = searchParams.get("propiedadId")
  const aniosParam = searchParams.get("anios")

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

    const propiedadIds = propiedades?.map((p) => p.id) ?? []
    const filteredPropiedadIds = propiedadId
      ? propiedadIds.filter((id) => id === propiedadId)
      : propiedadIds

    if (filteredPropiedadIds.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron propiedades para exportar" },
        { status: 404 }
      )
    }

    // Mapa de propiedades para obtener dirección y ciudad
    const propiedadesMap = new Map(
      (propiedades ?? []).map((p) => [
        p.id,
        `${p.direccion}, ${p.ciudad}`,
      ])
    )

    // Calcular fecha de inicio según número de años
    const fechaInicio = new Date()
    fechaInicio.setFullYear(fechaInicio.getFullYear() - anios)
    const fechaInicioISO = fechaInicio.toISOString()

    // ============================================
    // HOJA 1: ARRENDATARIOS
    // ============================================
    const { data: contratos, error: contratosError } = await admin
      .from("contratos")
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        estado,
        canon_mensual,
        arrendatario_id,
        propiedad_id,
        arrendatario:arrendatarios(
          id,
          nombre,
          email,
          cedula,
          celular
        )
      `)
      .in("propiedad_id", filteredPropiedadIds)
      .gte("fecha_inicio", fechaInicioISO.slice(0, 10))
      .order("fecha_inicio", { ascending: false })

    if (contratosError) throw contratosError

    // Formatear datos de arrendatarios para Excel
    const arrendatariosData = (contratos ?? []).map((c: any) => {
      const arrendatario = c.arrendatario as any
      return {
        "Propiedad": propiedadesMap.get(c.propiedad_id) || "Desconocida",
        "Nombre Arrendatario": arrendatario?.nombre || "",
        "Email": arrendatario?.email || "",
        "Cédula": arrendatario?.cedula || "",
        "Celular": arrendatario?.celular || "",
        "Fecha Inicio Contrato": c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString("es-CO") : "",
        "Fecha Fin Contrato": c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString("es-CO") : "N/A",
        "Canon Mensual": c.canon_mensual
          ? new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            }).format(c.canon_mensual)
          : "",
        "Estado Contrato": c.estado || "",
        "Año de Inicio": c.fecha_inicio ? new Date(c.fecha_inicio).getFullYear() : "",
      }
    })

    // ============================================
    // HOJA 2: GASTOS DE MANTENIMIENTO
    // ============================================
    // Primero obtener los IDs de solicitudes de mantenimiento
    const { data: solicitudes, error: solicitudesError } = await admin
      .from("solicitudes_mantenimiento")
      .select("id, propiedad_id, detalle")
      .in("propiedad_id", filteredPropiedadIds)

    if (solicitudesError) throw solicitudesError

    const solicitudIds = solicitudes?.map((s) => s.id) ?? []
    const solicitudesMap = new Map(
      (solicitudes ?? []).map((s) => [s.id, s.detalle || ""])
    )
    const solicitudesPropiedadMap = new Map(
      (solicitudes ?? []).map((s) => [s.id, s.propiedad_id])
    )

    // Obtener gestiones con sus costos
    const gastosData: any[] = []

    if (solicitudIds.length > 0) {
      const { data: gestiones, error: gestionesError } = await admin
        .from("mantenimiento_gestiones")
        .select("*")
        .in("solicitud_id", solicitudIds)
        .gte("fecha_ejecucion", fechaInicioISO.slice(0, 10))
        .order("fecha_ejecucion", { ascending: false })

      if (gestionesError) throw gestionesError

      for (const gestion of gestiones ?? []) {
        const propiedadId = solicitudesPropiedadMap.get(gestion.solicitud_id)
        gastosData.push({
          "Propiedad": propiedadId ? (propiedadesMap.get(propiedadId) || "Desconocida") : "Desconocida",
          "Descripción Solicitud": solicitudesMap.get(gestion.solicitud_id) || "",
          "Descripción Gestión": gestion.descripcion || "",
          "Fecha Ejecución": gestion.fecha_ejecucion
            ? new Date(gestion.fecha_ejecucion).toLocaleDateString("es-CO")
            : "",
          "Costo": gestion.costo
            ? new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              }).format(gestion.costo)
            : "",
          "Proveedor": gestion.proveedor || "",
          "Año": gestion.fecha_ejecucion
            ? new Date(gestion.fecha_ejecucion).getFullYear()
            : "",
        })
      }
    }

    // ============================================
    // CREAR ARCHIVO EXCEL
    // ============================================
    const workbook = XLSX.utils.book_new()

    // Hoja de Arrendatarios
    const hojaArrendatarios = XLSX.utils.json_to_sheet(arrendatariosData)
    XLSX.utils.book_append_sheet(workbook, hojaArrendatarios, "Arrendatarios")

    // Hoja de Gastos de Mantenimiento
    const hojaGastos = XLSX.utils.json_to_sheet(gastosData.length > 0 ? gastosData : [{ "Mensaje": "No hay gastos de mantenimiento en el periodo seleccionado" }])
    XLSX.utils.book_append_sheet(workbook, hojaGastos, "Gastos Mantenimiento")

    // Generar buffer y convertir a Uint8Array
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    const uint8Array = new Uint8Array(buffer as ArrayBuffer)

    // Retornar archivo
    return new Response(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte_financiero_${Date.now()}.xlsx"`,
      },
    })

  } catch (err) {
    console.error("[GET /api/propietario/exportar/datos]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
