import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import * as XLSX from 'xlsx'

/**
 * GET /api/mantenimiento/[id]/gestiones/exportar
 * Exporta todas las gestiones a Excel (.xlsx real)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  // Obtener información de la solicitud y propiedad
  const { data: solicitud } = await admin
    .from("solicitudes_mantenimiento")
    .select(`
      id,
      nombre_completo,
      detalle,
      created_at,
      propiedades ( direccion, ciudad )
    `)
    .eq("id", id)
    .single()

  const propInfo = solicitud?.propiedades as { direccion?: string; ciudad?: string } | null
  const propRef = propInfo ? `${propInfo.direccion || ''}, ${propInfo.ciudad || ''}`.trim() : 'N/A'

  // Obtener todas las gestiones - query simple primero para verificar
  const { data: gestiones, error: gestionesError } = await admin
    .from("mantenimiento_gestiones")
    .select("*")
    .eq("solicitud_id", id)
    .order("fecha_ejecucion", { ascending: false })

  if (gestionesError) {
    console.error("Error obteniendo gestiones:", gestionesError)
    return NextResponse.json({ error: "Error obteniendo gestiones", details: gestionesError.message }, { status: 500 })
  }

  if (!gestiones || gestiones.length === 0) {
    return NextResponse.json({ error: "No hay gestiones para exportar" }, { status: 404 })
  }

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // HOJA 1: Resumen
  const resumenData = [
    ["REPORTE DE MANTENIMIENTO - ARRENLEX"],
    [""],
    ["PROPIEDAD", propRef],
    ["SOLICITADO POR", solicitud?.nombre_completo || 'N/A'],
    ["FECHA SOLICITUD", solicitud?.created_at ? new Date(solicitud.created_at).toLocaleDateString('es-CO') : 'N/A'],
    ["DESCRIPCIÓN PROBLEMA", solicitud?.detalle || 'N/A'],
    [""],
    ["TOTAL REGISTROS", gestiones.length],
    ["TOTAL GASTADO", `$${gestiones.reduce((sum, g) => sum + Number(g.costo || 0), 0).toLocaleString('es-CO')}`],
    ["FECHA EXPORTACIÓN", new Date().toLocaleDateString('es-CO')],
  ]
  const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData)
  XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen")

  // HOJA 2: Gestiones detalladas
  const gestionesData = [
    // Encabezados
    [
      "#",
      "FECHA EJECUCIÓN",
      "PROVEEDOR",
      "DESCRIPCIÓN DEL TRABAJO",
      "COSTO",
      "FECHA CREACIÓN"
    ],
    // Datos - solo campos básicos que siempre existen
    ...gestiones.map((g: any, idx: number) => [
      idx + 1,
      g.fecha_ejecucion ? new Date(g.fecha_ejecucion).toLocaleDateString('es-CO') : '',
      g.proveedor || '',
      g.descripcion || '',
      Number(g.costo || 0),
      g.created_at ? new Date(g.created_at).toLocaleDateString('es-CO') : ''
    ]),
    // Total al final
    [
      "",
      "",
      "",
      "TOTAL",
      gestiones.reduce((sum: number, g: any) => sum + Number(g.costo || 0), 0),
      ""
    ]
  ]

  const gestionesSheet = XLSX.utils.aoa_to_sheet(gestionesData)

  // Ajustar anchos de columnas
  gestionesSheet['!cols'] = [
    { wch: 5 },   // #
    { wch: 15 },  // Fecha
    { wch: 25 },  // Proveedor
    { wch: 50 },  // Descripción
    { wch: 15 },  // Costo
    { wch: 15 }   // Fecha creación
  ]

  XLSX.utils.book_append_sheet(workbook, gestionesSheet, "Gestiones")

  // Generar buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer as Buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="mantenimiento-${propRef.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx"`
    }
  })
}
