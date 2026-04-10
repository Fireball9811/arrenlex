import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/mensajes/pasar-arrendatario
// Toma un registro de arrenlex_form_intake y lo convierte en arrendatario:
//   1. Inserta en `arrendatarios` con todos los campos mapeables (SIN crear usuario en Auth)
//   2. Crea un contrato en estado "borrador" para que aparezca en inquilinos activos
//   3. Marca el intake como gestionado = true
//   4. NO envía correo (el usuario se crea después con el botón "Sin usuario")
//
// Admin: puede pasar cualquier registro
// Propietario: solo puede pasar registros de sus propias propiedades
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Verificar el rol del usuario
  const { data: perfil } = await admin
    .from("perfiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (perfil?.role !== "admin" && perfil?.role !== "propietario") {
    return NextResponse.json({ error: "Solo administradores y propietarios pueden realizar esta acción" }, { status: 403 })
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
    .select("*, propiedades:propiedad_id(id, ciudad, area, valor_arriendo, user_id)")
    .eq("id", intakeId)
    .maybeSingle()

  if (intakeError || !intake) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
  }

  // ── 1.1. Validar que el propietario tenga permiso sobre esta propiedad ─────
  if (perfil?.role === "propietario") {
    const propiedad = Array.isArray(intake.propiedades)
      ? intake.propiedades[0] ?? null
      : (intake.propiedades as { id?: string; user_id?: string } | null)

    if (!propiedad || propiedad.user_id !== user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para pasar este arrendatario. La propiedad no te pertenece." },
        { status: 403 }
      )
    }
  }

  if (!intake.nombre || typeof intake.nombre !== "string") {
    return NextResponse.json(
      { error: "El candidato no tiene nombre registrado." },
      { status: 400 }
    )
  }

  if (!intake.email || typeof intake.email !== "string") {
    return NextResponse.json(
      { error: "El candidato no tiene email registrado." },
      { status: 400 }
    )
  }

  const nombreTrimmed = intake.nombre.trim()
  const emailTrimmed = intake.email.trim().toLowerCase()

  const propiedad = Array.isArray(intake.propiedades)
    ? intake.propiedades[0] ?? null
    : (intake.propiedades as { id?: string; ciudad?: string; area?: number; valor_arriendo?: number } | null)

  // ── 2. Verificar si ya existe un arrendatario con ese email ─────────────
  const { data: arrendatarioExistente } = await admin
    .from("arrendatarios")
    .select("id, email, contratos(id, estado)")
    .eq("email", emailTrimmed)
    .maybeSingle()

  let arrendatarioId: string

  if (arrendatarioExistente) {
    // Ya existe el arrendatario, usar su ID
    arrendatarioId = arrendatarioExistente.id

    // Verificar si ya tiene contrato activo o borrador
    const tieneContrato = arrendatarioExistente.contratos?.some(
      (c: any) => c.estado === "activo" || c.estado === "borrador"
    )

    if (tieneContrato) {
      return NextResponse.json({
        ok: true,
        message: "El arrendatario ya existe y tiene un contrato",
        arrendatarioId,
        yaExiste: true,
      })
    }
  } else {
    // ── 3. Crear arrendatario (SIN usuario en Auth) ───────────────────────
    const { data: newArrendatario, error: arrError } = await admin
      .from("arrendatarios")
      .insert({
        user_id: null, // Sin usuario inicialmente
        // Datos básicos - mismos nombres que intake
        nombre: nombreTrimmed,
        email: emailTrimmed,
        cedula: intake.cedula ?? null,
        cedula_ciudad_expedicion: intake.cedula_ciudad_expedicion ?? null,
        telefono: intake.telefono ?? null,
        celular: intake.telefono ?? null,
        direccion_residencia: null, // Se llena cuando se edita el arrendatario

        // Familiares - mismos nombres que intake
        adultos_habitantes: intake.adultos_habitantes ?? null,
        ninos_habitantes: intake.ninos_habitantes ?? null,
        mascotas_cantidad: intake.mascotas_cantidad ?? null,

        // Laboral - mismos nombres que intake
        salario_principal: intake.salario_principal ?? null,
        salario_secundario: intake.salario_secundario ?? null,
        empresa_principal: intake.empresa_principal ?? null,
        empresa_secundaria: intake.empresa_secundaria ?? null,
        tiempo_servicio_principal_meses: intake.tiempo_servicio_principal_meses ?? null,
        tiempo_servicio_secundario_meses: intake.tiempo_servicio_secundario_meses ?? null,

        // Coarrendatario - mismos nombres que intake
        coarrendatario_nombre: intake.coarrendatario_nombre ?? null,
        coarrendatario_cedula: intake.coarrendatario_cedula ?? null,
        coarrendatario_telefono: intake.coarrendatario_telefono ?? null,
        coarrendatario_cedula_expedicion: intake.coarrendatario_cedula_expedicion ?? null,
        coarrendatario_email: intake.coarrendatario_email ?? null,

        // Otros
        autorizacion_datos:
          typeof intake.autorizacion === "string" &&
          (intake.autorizacion.toLowerCase().includes("si") ||
            intake.autorizacion.toLowerCase().includes("sí")),
      })
      .select("id")
      .single()

    if (arrError || !newArrendatario) {
      console.error("[pasar-arrendatario] Error insertando arrendatario:", arrError)
      return NextResponse.json({ error: arrError?.message || "Error al crear arrendatario" }, { status: 500 })
    }

    arrendatarioId = newArrendatario.id
  }

  // ── 4. Obtener user_id de la propiedad para el contrato ───────────────────
  let propiedadUserId: string | null = null
  if (perfil?.role === "propietario") {
    propiedadUserId = user.id
  } else {
    // Admin: obtener el user_id de la propiedad
    const { data: propData } = await admin
      .from("propiedades")
      .select("user_id")
      .eq("id", propiedad?.id ?? "")
      .maybeSingle()
    propiedadUserId = propData?.user_id ?? null
  }

  // ── 5. Crear contrato en estado borrador para que aparezca en inquilinos ─
  const { error: contratoError } = await admin
    .from("contratos")
    .insert({
      arrendatario_id: arrendatarioId,
      propiedad_id: propiedad?.id ?? null,
      user_id: propiedadUserId,
      estado: "borrador",
      fecha_inicio: new Date().toISOString().split('T')[0], // Fecha actual por defecto
      duracion_meses: 12, // Por defecto 12 meses
      canon_mensual: propiedad?.valor_arriendo ?? 0,
      ciudad_firma: "Bogotá", // Por defecto, se debe editar después
    })

  if (contratoError) {
    console.error("[pasar-arrendatario] Error creando contrato borrador:", contratoError)
    // No fallamos si hay error con el contrato, el arrendatario ya está creado
  }

  // ── 6. Marcar intake como gestionado ───────────────────────────────────
  await admin
    .from("arrenlex_form_intake")
    .update({ gestionado: true })
    .eq("id", intakeId)

  return NextResponse.json({
    ok: true,
    arrendatarioId,
    email: emailTrimmed,
    nombre: nombreTrimmed,
    message: `Arrendatario creado exitosamente. Ahora puedes editar los datos en Reportes de Personas.`,
  })
}
