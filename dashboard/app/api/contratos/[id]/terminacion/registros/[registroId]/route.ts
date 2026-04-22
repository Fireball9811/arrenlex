import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

async function verificar(contratoId: string, registroId: string) {
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
    .select("id, user_id")
    .eq("id", contratoId)
    .single()

  if (!contrato) {
    return { error: NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 }) }
  }

  if (role === "propietario" && contrato.user_id !== user.id) {
    return { error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) }
  }

  const { data: registro } = await admin
    .from("terminacion_registros")
    .select("*, terminaciones_contrato!inner(contrato_id)")
    .eq("id", registroId)
    .single()

  if (!registro || registro.terminaciones_contrato.contrato_id !== contratoId) {
    return { error: NextResponse.json({ error: "Registro no encontrado" }, { status: 404 }) }
  }

  return { admin, supabase, registro }
}

// GET - URL firmada de la foto
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; registroId: string }> }
) {
  const { id, registroId } = await params
  const ctx = await verificar(id, registroId)
  if ("error" in ctx) return ctx.error

  if (!ctx.registro.foto_url) {
    return NextResponse.json({ error: "Este registro no tiene foto" }, { status: 404 })
  }

  const { data, error } = await ctx.supabase.storage
    .from("documentos")
    .createSignedUrl(ctx.registro.foto_url, 60 * 60) // 1h

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo generar URL" }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}

// PATCH - Editar descripción/valor
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; registroId: string }> }
) {
  const { id, registroId } = await params
  const ctx = await verificar(id, registroId)
  if ("error" in ctx) return ctx.error

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if (body.descripcion !== undefined) updates.descripcion = String(body.descripcion)
  if (body.valor !== undefined) updates.valor = Number(body.valor) || 0
  if (body.orden !== undefined) updates.orden = Number(body.orden) || 0

  const { data, error } = await ctx.admin
    .from("terminacion_registros")
    .update(updates)
    .eq("id", registroId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE - Eliminar registro + foto
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; registroId: string }> }
) {
  const { id, registroId } = await params
  const ctx = await verificar(id, registroId)
  if ("error" in ctx) return ctx.error

  if (ctx.registro.foto_url) {
    await ctx.supabase.storage.from("documentos").remove([ctx.registro.foto_url])
  }

  const { error } = await ctx.admin
    .from("terminacion_registros")
    .delete()
    .eq("id", registroId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
