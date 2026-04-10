import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/mantenimiento/[id]/gestiones/diagnostico
 * Diagnóstico completo del sistema de mantenimiento
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const diagnostic: Record<string, any> = {
    solicitud_id: id,
    tablas: {} as Record<string, boolean>,
    storage: {} as Record<string, any>,
    counts: {} as Record<string, number>,
    errors: [] as string[],
    resultado: "OK"
  }

  // 1. Verificar bucket de storage
  try {
    const { data: buckets, error } = await admin.storage.listBuckets()

    const mantenimientoBucket = buckets?.find((b: any) => b.id === 'mantenimiento-adjuntos')
    diagnostic.storage.bucket_existe = !!mantenimientoBucket
    diagnostic.storage.bucket_info = mantenimientoBucket || null
    diagnostic.storage.todos_los_buckets = buckets?.map((b: any) => ({ id: b.id, name: b.name })) || []

    if (!mantenimientoBucket) {
      diagnostic.errors.push("❌ El bucket 'mantenimiento-adjuntos' NO existe")
      diagnostic.resultado = "ERROR_CRÍTICO"
    }
  } catch (e: any) {
    diagnostic.errors.push(`Excepción verificando storage: ${e.message}`)
    diagnostic.storage.bucket_existe = false
    diagnostic.resultado = "ERROR"
  }

  // 2. Verificar tablas
  try {
    const { data: solicitud } = await admin
      .from("solicitudes_mantenimiento")
      .select("id")
      .eq("id", id)
      .single()

    diagnostic.tablas.solicitudes_mantenimiento = !!solicitud
  } catch (e: any) {
    diagnostic.errors.push(`Error en solicitudes_mantenimiento: ${e.message}`)
    diagnostic.resultado = "ERROR"
  }

  try {
    const { data: gestiones, error } = await admin
      .from("mantenimiento_gestiones")
      .select("id")
      .eq("solicitud_id", id)

    diagnostic.tablas.mantenimiento_gestiones = !error
    diagnostic.counts.gestiones = gestiones?.length || 0

    if (error) {
      diagnostic.errors.push(`Error en mantenimiento_gestiones: ${error.message}`)
      diagnostic.resultado = "ERROR"
    }
  } catch (e: any) {
    diagnostic.errors.push(`Excepción en mantenimiento_gestiones: ${e.message}`)
    diagnostic.resultado = "ERROR"
  }

  try {
    const { count, error } = await admin
      .from("mantenimiento_adjuntos")
      .select("*", { count: "exact", head: true })

    diagnostic.tablas.mantenimiento_adjuntos = !error
    diagnostic.counts.adjuntos = count || 0

    if (error) {
      diagnostic.errors.push(`Error en mantenimiento_adjuntos: ${error.message}`)
    }
  } catch (e: any) {
    diagnostic.errors.push(`Excepción en mantenimiento_adjuntos: ${e.message}`)
  }

  // 3. Verificar columnas en mantenimiento_gestiones
  try {
    const { data: testQuery } = await admin
      .from("mantenimiento_gestiones")
      .select("id, proveedor_cedula, proveedor_telefono")
      .eq("solicitud_id", id)
      .limit(1)

    diagnostic.columnas_proveedor = !testQuery
  } catch (e) {
    diagnostic.columnas_proveedor = false
    diagnostic.errors.push("Las columnas de proveedor pueden no existir")
  }

  return NextResponse.json(diagnostic)
}
