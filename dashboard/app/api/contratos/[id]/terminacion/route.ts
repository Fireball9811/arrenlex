import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

async function verificarAcceso(contratoId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }

  const role = await getUserRole(supabase, user)
  if (!role || (role !== "admin" && role !== "propietario")) {
    return { error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) }
  }

  const admin = createAdminClient()
  const { data: contrato } = await admin
    .from("contratos")
    .select("id, user_id, estado, propiedad_id")
    .eq("id", contratoId)
    .single()

  if (!contrato) {
    return { error: NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 }) }
  }

  if (role === "propietario" && contrato.user_id !== user.id) {
    return { error: NextResponse.json({ error: "Sin permiso sobre este contrato" }, { status: 403 }) }
  }

  return { admin, contrato, user, role }
}

// GET - Obtener terminación (la crea vacía si no existe) + registros
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id
  const ctx = await verificarAcceso(contratoId)
  if ("error" in ctx) return ctx.error
  const { admin } = ctx

  let { data: terminacion } = await admin
    .from("terminaciones_contrato")
    .select("*")
    .eq("contrato_id", contratoId)
    .maybeSingle()

  if (!terminacion) {
    const { data: nueva, error } = await admin
      .from("terminaciones_contrato")
      .insert({ contrato_id: contratoId })
      .select()
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    terminacion = nueva
  }

  const { data: registros } = await admin
    .from("terminacion_registros")
    .select("*")
    .eq("terminacion_id", terminacion.id)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true })

  return NextResponse.json({ terminacion, registros: registros ?? [] })
}

// PUT - Upsert de la terminación (datos del formulario)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id
  const ctx = await verificarAcceso(contratoId)
  if ("error" in ctx) return ctx.error
  const { admin, contrato } = ctx

  const body = await request.json()

  const payload = {
    contrato_id: contratoId,
    deposito: Number(body.deposito) || 0,
    fecha_entrega: body.fecha_entrega || null,
    lectura_agua: body.lectura_agua ?? null,
    valor_agua: Number(body.valor_agua) || 0,
    lectura_gas: body.lectura_gas ?? null,
    valor_gas: Number(body.valor_gas) || 0,
    lectura_energia: body.lectura_energia ?? null,
    valor_energia: Number(body.valor_energia) || 0,
    notas: body.notas ?? null,
  }

  const { data, error } = await admin
    .from("terminaciones_contrato")
    .upsert(payload, { onConflict: "contrato_id" })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Si el contrato estaba activo, pasarlo a pendiente_cierre al iniciar la terminación
  if (contrato.estado === "activo") {
    await admin
      .from("contratos")
      .update({ estado: "pendiente_cierre" })
      .eq("id", contratoId)
  }

  return NextResponse.json(data)
}
