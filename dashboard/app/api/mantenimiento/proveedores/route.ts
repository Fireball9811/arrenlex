import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/mantenimiento/proveedores
 * Devuelve la lista de proveedores únicos ya usados en gestiones
 * de las propiedades del usuario (propietario) o de todas (admin).
 * Ordenados por frecuencia de uso descendente.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role === "inquilino") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()

  // Obtener IDs de propiedades del usuario (propietario) o todas (admin)
  let propiedadIds: string[] | null = null
  if (role === "propietario") {
    const { data: props } = await admin
      .from("propiedades")
      .select("id")
      .eq("user_id", user.id)
    propiedadIds = (props ?? []).map((p) => p.id)
    if (propiedadIds.length === 0) return NextResponse.json([])
  }

  // Obtener solicitudes de esas propiedades
  let solicitudesQuery = admin
    .from("solicitudes_mantenimiento")
    .select("id")

  if (propiedadIds) {
    solicitudesQuery = solicitudesQuery.in("propiedad_id", propiedadIds)
  }

  const { data: solicitudes } = await solicitudesQuery
  const solicitudIds = (solicitudes ?? []).map((s) => s.id)
  if (solicitudIds.length === 0) return NextResponse.json([])

  // Obtener todos los proveedores no nulos de esas gestiones
  const { data: gestiones } = await admin
    .from("mantenimiento_gestiones")
    .select("proveedor")
    .in("solicitud_id", solicitudIds)
    .not("proveedor", "is", null)

  if (!gestiones?.length) return NextResponse.json([])

  // Contar frecuencia y deduplicar (case-insensitive)
  const conteo = new Map<string, { nombre: string; count: number }>()
  for (const g of gestiones) {
    const nombre = (g.proveedor as string).trim()
    if (!nombre) continue
    const key = nombre.toLowerCase()
    if (conteo.has(key)) {
      conteo.get(key)!.count++
    } else {
      conteo.set(key, { nombre, count: 1 })
    }
  }

  // Ordenar por frecuencia descendente, luego alfabético
  const result = Array.from(conteo.values())
    .sort((a, b) => b.count - a.count || a.nombre.localeCompare(b.nombre))
    .map((v) => v.nombre)

  return NextResponse.json(result)
}
