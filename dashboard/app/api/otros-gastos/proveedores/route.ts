import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Obtiene el historial de proveedores usados por el propietario actual
 * Retorna lista única de nombres con sus datos asociados más recientes
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "propietario" && role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Obtener los registros más recientes de cada proveedor (agrupado por cédula)
  const { data, error } = await admin
    .from("otros_gastos")
    .select(`
      nombre_completo,
      cedula,
      tarjeta_profesional,
      correo_electronico
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[otros-gastos proveedores GET]", error)
    return NextResponse.json({ error: "Error al obtener proveedores" }, { status: 500 })
  }

  // Agrupar por cédula y mantener el registro más reciente de cada uno
  const proveedoresUnicos = new Map<string, {
    nombre_completo: string
    cedula: string
    tarjeta_profesional: string | null
    correo_electronico: string | null
  }>()

  for (const registro of data ?? []) {
    if (!proveedoresUnicos.has(registro.cedula)) {
      proveedoresUnicos.set(registro.cedula, {
        nombre_completo: registro.nombre_completo,
        cedula: registro.cedula,
        tarjeta_profesional: registro.tarjeta_profesional,
        correo_electronico: registro.correo_electronico,
      })
    }
  }

  // Convertir a array y ordenar alfabéticamente por nombre
  const proveedores = Array.from(proveedoresUnicos.values()).sort((a, b) =>
    a.nombre_completo.localeCompare(b.nombre_completo, "es")
  )

  return NextResponse.json(proveedores)
}
