import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminRole } from "@/lib/auth/role"

/**
 * POST - Activa todos los contratos que están en estado "borrador"
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

  // Primero ver todos los contratos
  const { data: todosContratos, error: errorTodos } = await admin
    .from("contratos")
    .select("id, estado, arrendatario_id")

  if (errorTodos) {
    return NextResponse.json({ error: errorTodos.message }, { status: 500 })
  }

  const contratosBorrador = todosContratos?.filter(c => c.estado === "borrador") || []
  const contratosOtrosEstados = todosContratos?.filter(c => c.estado !== "borrador") || []

  // Activar contratos en borrador
  const resultados = []
  for (const contrato of contratosBorrador) {
    const { data, error } = await admin
      .from("contratos")
      .update({ estado: "activo" })
      .eq("id", contrato.id)
      .select()

    resultados.push({
      id: contrato.id,
      estadoAnterior: "borrador",
      exitoso: !error,
      error: error?.message
    })
  }

  return NextResponse.json({
    totalContratos: todosContratos?.length || 0,
    activados: contratosBorrador.length,
    otrosEstados: contratosOtrosEstados.map(c => ({ id: c.id, estado: c.estado })),
    resultados
  })
}
