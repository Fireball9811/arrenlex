import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

// GET - Listar propietarios con conteo de propiedades (solo admin)
export async function GET(request: Request) {
  console.log("🔵 [admin/propietarios] GET iniciado")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Verificar que sea admin
  const role = await getUserRole(supabase, user)
  if (role !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden ver esta lista" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Obtener todos los usuarios con rol "propietario"
  const { data: propietarios, error: errorPropietarios } = await admin
    .from("users")
    .select(`
      id,
      email,
      nombre,
      celular,
      cedula,
      cedula_lugar_expedicion,
      direccion,
      activo,
      bloqueado,
      created_at,
      cuenta_bancaria_1_entidad,
      cuenta_bancaria_1_numero,
      cuenta_bancaria_1_tipo,
      cuenta_bancaria_2_entidad,
      cuenta_bancaria_2_numero,
      cuenta_bancaria_2_tipo,
      llave_bancaria_1,
      llave_bancaria_2,
      role
    `)
    .eq("role", "propietario")
    .order("created_at", { ascending: false })

  if (errorPropietarios) {
    console.error("❌ Error obteniendo propietarios:", errorPropietarios)
    return NextResponse.json({ error: errorPropietarios.message }, { status: 500 })
  }

  // Obtener todas las propiedades para contarlas por propietario
  const { data: propiedades, error: errorPropiedades } = await admin
    .from("propiedades")
    .select("id, user_id")

  if (errorPropiedades) {
    console.error("❌ Error obteniendo propiedades:", errorPropiedades)
    return NextResponse.json({ error: errorPropiedades.message }, { status: 500 })
  }

  // Crear un mapa de conteo de propiedades por user_id
  const propiedadesPorPropietario = new Map<string, number>()
  for (const prop of propiedades || []) {
    const current = propiedadesPorPropietario.get(prop.user_id) || 0
    propiedadesPorPropietario.set(prop.user_id, current + 1)
  }

  // Agregar el conteo de propiedades a cada propietario
  const propietariosConConteo = (propietarios || []).map((p: any) => ({
    ...p,
    propiedades_count: propiedadesPorPropietario.get(p.id) || 0,
  }))

  console.log("✓ Propietarios con conteo:", propietariosConConteo.length)

  return NextResponse.json(propietariosConConteo ?? [])
}
