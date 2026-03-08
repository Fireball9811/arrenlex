import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateTempPassword } from "@/lib/auth/temp-password"
import { sendBienvenidaArrendatario } from "@/lib/email/send-bienvenida-arrendatario"

// POST /api/mensajes/pasar-arrendatario
// Toma un registro de arrenlex_form_intake y lo convierte en arrendatario:
//   1. Crea usuario en Supabase Auth (o actualiza si ya existe)
//   2. Inserta en `arrendatarios` con todos los campos mapeables
//   3. Marca el intake como gestionado = true
//   4. Envía correo de bienvenida con credenciales
export async function POST(request: Request) {
  // Solo admins pueden hacer esto
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Verificar que el usuario autenticado sea admin
  const { data: perfil } = await admin
    .from("perfiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (perfil?.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden realizar esta acción" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const intakeId = typeof body.intakeId === "string" ? body.intakeId.trim() : null
  if (!intakeId) {
    return NextResponse.json({ error: "intakeId es requerido" }, { status: 400 })
  }

  // ── 1. Leer el intake ───────────────────────────────────────────────────
  const { data: intake, error: intakeError } = await admin
    .from("arrenlex_form_intake")
    .select("*, propiedades:propiedad_id(id, ciudad, area, valor_arriendo)")
    .eq("id", intakeId)
    .maybeSingle()

  if (intakeError || !intake) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
  }

  if (!intake.email || typeof intake.email !== "string") {
    return NextResponse.json(
      { error: "El candidato no tiene email registrado. No se puede crear el usuario." },
      { status: 400 }
    )
  }
  if (!intake.nombre || typeof intake.nombre !== "string") {
    return NextResponse.json(
      { error: "El candidato no tiene nombre registrado." },
      { status: 400 }
    )
  }

  const emailTrimmed = intake.email.trim().toLowerCase()
  const nombreTrimmed = intake.nombre.trim()

  const propiedad = Array.isArray(intake.propiedades)
    ? intake.propiedades[0] ?? null
    : (intake.propiedades as { id?: string; ciudad?: string; area?: number; valor_arriendo?: number } | null)

  // ── 2. Crear o actualizar usuario en Supabase Auth ──────────────────────
  const tempPassword = generateTempPassword()
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000

  let newUserId: string

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: emailTrimmed,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      must_change_password: true,
      temp_password_expires_at: expiresAt,
    },
  })

  if (createError) {
    const alreadyExists =
      createError.message?.toLowerCase().includes("already") ||
      createError.message?.toLowerCase().includes("registered")

    if (!alreadyExists) {
      console.error("[pasar-arrendatario] Error creando usuario:", createError)
      return NextResponse.json({ error: createError.message || "Error al crear usuario" }, { status: 500 })
    }

    // Usuario ya existe → buscar su ID y actualizar contraseña
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existingUser = listData?.users.find((u) => u.email?.toLowerCase() === emailTrimmed)
    if (!existingUser) {
      return NextResponse.json({ error: "El correo ya existe pero no se pudo localizar el usuario" }, { status: 500 })
    }
    newUserId = existingUser.id

    await admin.auth.admin.updateUserById(newUserId, {
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true, temp_password_expires_at: expiresAt },
    })

    // Actualizar perfil existente si aplica
    await admin
      .from("perfiles")
      .update({ nombre: nombreTrimmed, celular: intake.telefono ?? null, cedula: intake.cedula ?? null })
      .eq("id", newUserId)
  } else {
    if (!newUser.user) {
      return NextResponse.json({ error: "Error inesperado al crear usuario" }, { status: 500 })
    }
    newUserId = newUser.user.id

    // Insertar perfil nuevo
    const { error: perfilError } = await admin.from("perfiles").insert({
      id: newUserId,
      email: emailTrimmed,
      nombre: nombreTrimmed,
      role: "inquilino",
      activo: true,
      bloqueado: false,
      celular: intake.telefono ?? null,
      cedula: intake.cedula ?? null,
    })

    if (perfilError) {
      console.error("[pasar-arrendatario] Error insertando perfil:", perfilError)
    }
  }

  // ── 3. Verificar si ya existe un arrendatario con ese user_id ──────────
  const { data: arrendatarioExistente } = await admin
    .from("arrendatarios")
    .select("id")
    .eq("user_id", newUserId)
    .maybeSingle()

  if (!arrendatarioExistente) {
    const { error: arrError } = await admin.from("arrendatarios").insert({
      user_id: newUserId,
      nombre: nombreTrimmed,
      cedula: intake.cedula ?? null,
      telefono: intake.telefono ?? null,
      salario_principal: intake.salario ?? null,
      empresa_principal: intake.empresa_arrendatario ?? null,
      tiempo_servicio_principal_meses: intake.antiguedad_meses ?? null,
      salario_secundario: intake.salario_2 ?? null,
      empresa_secundaria: intake.empresa_coarrendatario ?? null,
      tiempo_servicio_secundario_meses: intake.antiguedad_meses_2 ?? null,
      coarrendatario_nombre: intake.nombre_coarrendatario ?? null,
      coarrendatario_cedula: intake.cedula_coarrendatario ?? null,
      coarrendatario_telefono: intake.telefono_coarrendatario ?? null,
      adultos_habitantes: intake.personas ?? null,
      ninos_habitantes: intake.ninos ?? null,
      mascotas_cantidad: intake.mascotas ?? null,
      autorizacion_datos:
        typeof intake.autorizacion === "string" &&
        (intake.autorizacion.toLowerCase().includes("si") ||
          intake.autorizacion.toLowerCase().includes("sí")),
    })

    if (arrError) {
      console.error("[pasar-arrendatario] Error insertando arrendatario:", arrError)
      return NextResponse.json({ error: arrError.message || "Error al crear arrendatario" }, { status: 500 })
    }
  }

  // ── 4. Marcar intake como gestionado ───────────────────────────────────
  await admin
    .from("arrenlex_form_intake")
    .update({ gestionado: true })
    .eq("id", intakeId)

  // ── 5. Enviar correo de bienvenida (no bloquea respuesta en caso de fallo) ─
  sendBienvenidaArrendatario({
    to: emailTrimmed,
    nombre: nombreTrimmed,
    tempPassword,
    propiedad: propiedad
      ? {
          ciudad: propiedad.ciudad ?? null,
          area: propiedad.area ?? null,
          valor_arriendo: propiedad.valor_arriendo ?? null,
        }
      : undefined,
  }).catch((err) => console.error("[pasar-arrendatario] Error enviando email:", err))

  return NextResponse.json({
    ok: true,
    email: emailTrimmed,
    message: `Arrendatario creado. Acceso enviado a ${emailTrimmed}`,
  })
}
