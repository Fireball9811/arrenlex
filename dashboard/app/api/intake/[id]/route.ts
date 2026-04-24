import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

type PatchAccion =
  | "gestionar"
  | "descartar"
  | "editar_motivo"
  | "reactivar"
  | "completar"
  | "descompletar"

/**
 * PATCH - Actualiza el estado de un registro de intake.
 *
 * Body opcional (JSON): { accion: PatchAccion, motivo?: string }
 * - Sin body o accion="gestionar": marca gestionado=true (comportamiento original)
 * - "descartar": marca descartado=true, gestionado=true, guarda motivo y auditoría
 * - "editar_motivo": solo cambia motivo_descarte (requiere estar descartado)
 * - "reactivar": limpia el descarte y vuelve a pendiente (gestionado=false)
 * - "completar": marca completado=true, gestionado=true y registra auditoría
 * - "descompletar": reabre el registro (completado=false)
 *
 * Admin: puede actuar sobre cualquier registro.
 * Propietario: solo sobre registros de sus propiedades.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  // Parseo tolerante: el PATCH original se invocaba sin body
  let accion: PatchAccion = "gestionar"
  let motivo: string | undefined
  try {
    const text = await req.text()
    if (text && text.trim().length > 0) {
      const body = JSON.parse(text) as { accion?: PatchAccion; motivo?: string }
      if (body.accion) accion = body.accion
      if (typeof body.motivo === "string") motivo = body.motivo
    }
  } catch {
    // body vacío o inválido → usar default "gestionar"
  }

  const admin = createAdminClient()

  // Verificar pertenencia si es propietario
  if (role === "propietario") {
    const { data: intake } = await admin
      .from("arrenlex_form_intake")
      .select("propiedad_id, descartado, propiedades!inner(user_id)")
      .eq("id", id)
      .maybeSingle()

    if (!intake) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    const propiedad = Array.isArray(intake.propiedades)
      ? intake.propiedades[0]
      : intake.propiedades

    if (!propiedad || propiedad.user_id !== user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para modificar este registro" },
        { status: 403 }
      )
    }
  }

  // Construir update según la acción
  let update: Record<string, unknown>

  if (accion === "descartar") {
    const motivoLimpio = (motivo ?? "").trim()
    if (motivoLimpio.length === 0) {
      return NextResponse.json(
        { error: "Debes indicar el motivo del rechazo" },
        { status: 400 }
      )
    }
    update = {
      descartado: true,
      motivo_descarte: motivoLimpio,
      descartado_at: new Date().toISOString(),
      descartado_por: user.id,
      gestionado: true,
    }
  } else if (accion === "editar_motivo") {
    const motivoLimpio = (motivo ?? "").trim()
    if (motivoLimpio.length === 0) {
      return NextResponse.json(
        { error: "El motivo no puede estar vacío" },
        { status: 400 }
      )
    }
    const { data: actual } = await admin
      .from("arrenlex_form_intake")
      .select("descartado")
      .eq("id", id)
      .maybeSingle()
    if (!actual?.descartado) {
      return NextResponse.json(
        { error: "Solo se puede editar el motivo de registros descartados" },
        { status: 400 }
      )
    }
    update = { motivo_descarte: motivoLimpio }
  } else if (accion === "reactivar") {
    update = {
      descartado: false,
      motivo_descarte: null,
      descartado_at: null,
      descartado_por: null,
      gestionado: false,
      completado: false,
      completado_at: null,
      completado_por: null,
    }
  } else if (accion === "completar") {
    update = {
      completado: true,
      completado_at: new Date().toISOString(),
      completado_por: user.id,
      gestionado: true,
    }
  } else if (accion === "descompletar") {
    update = {
      completado: false,
      completado_at: null,
      completado_por: null,
    }
  } else {
    update = { gestionado: true }
  }

  const { error } = await admin
    .from("arrenlex_form_intake")
    .update(update)
    .eq("id", id)

  if (error) {
    console.error("[intake PATCH]", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, accion })
}

/**
 * DELETE - Elimina físicamente un registro de intake (para errores de ingreso).
 *
 * Admin: puede eliminar cualquier registro.
 * Propietario: solo puede eliminar registros de sus propiedades.
 *
 * Atención: borrado irreversible. Los registros descartados/gestionados también
 * se eliminan por esta ruta si se invoca explícitamente desde la UI.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  const admin = createAdminClient()

  if (role === "propietario") {
    const { data: intake } = await admin
      .from("arrenlex_form_intake")
      .select("propiedad_id, propiedades!inner(user_id)")
      .eq("id", id)
      .maybeSingle()

    if (!intake) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    const propiedad = Array.isArray(intake.propiedades)
      ? intake.propiedades[0]
      : intake.propiedades

    if (!propiedad || propiedad.user_id !== user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar este registro" },
        { status: 403 }
      )
    }
  }

  const { error } = await admin
    .from("arrenlex_form_intake")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[intake DELETE]", error)
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
