import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { handleSupabaseError } from "@/lib/api-error"

/**
 * GET /api/mantenimiento/[id]/gestiones
 * Lista todas las gestiones de una solicitud con sus adjuntos.
 * Solo admin y propietario de la propiedad.
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

  // Verificar que la solicitud existe y que el propietario tiene acceso
  const { data: solicitud, error: errSol } = await admin
    .from("solicitudes_mantenimiento")
    .select("id, propiedad_id, propiedades ( user_id )")
    .eq("id", id)
    .single()

  if (errSol || !solicitud) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const prop = solicitud.propiedades as { user_id?: string } | null
  if (role === "propietario" && prop?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await admin
    .from("mantenimiento_gestiones")
    .select(`
      id,
      solicitud_id,
      fecha_ejecucion,
      descripcion,
      proveedor,
      costo,
      created_by,
      created_at,
      mantenimiento_adjuntos!mantenimiento_adjuntos_gestion_id_fkey ( id, nombre_archivo, storage_path, tipo, created_at )
    `)
    .eq("solicitud_id", id)
    .order("fecha_ejecucion", { ascending: false })

  if (error) return handleSupabaseError("gestiones GET", error)

  return NextResponse.json(data ?? [])
}

/**
 * POST /api/mantenimiento/[id]/gestiones
 * Crea una nueva gestión para la solicitud.
 * Body: { fecha_ejecucion, descripcion, proveedor?, costo }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const { fecha_ejecucion, descripcion, proveedor, costo } = body as Record<string, unknown>

  if (!fecha_ejecucion || !descripcion) {
    return NextResponse.json({ error: "fecha_ejecucion and descripcion are required" }, { status: 400 })
  }

  const costoNum = costo !== undefined ? parseFloat(String(costo).replace(/[^0-9.]/g, "")) : 0
  if (isNaN(costoNum) || costoNum < 0) {
    return NextResponse.json({ error: "costo must be a non-negative number" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar acceso a la solicitud
  const { data: solicitud, error: errSol } = await admin
    .from("solicitudes_mantenimiento")
    .select("id, propiedad_id, propiedades ( user_id )")
    .eq("id", id)
    .single()

  if (errSol || !solicitud) return NextResponse.json({ error: "Solicitud not found" }, { status: 404 })

  const prop = solicitud.propiedades as { user_id?: string } | null
  if (role === "propietario" && prop?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: inserted, error: errInsert } = await admin
    .from("mantenimiento_gestiones")
    .insert({
      solicitud_id: id,
      fecha_ejecucion: String(fecha_ejecucion),
      descripcion: String(descripcion).trim(),
      proveedor: proveedor ? String(proveedor).trim() : null,
      costo: costoNum,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (errInsert) return handleSupabaseError("gestiones POST", errInsert)

  return NextResponse.json({ id: inserted?.id, ok: true }, { status: 201 })
}
