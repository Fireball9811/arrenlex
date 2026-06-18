import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function normalizarTexto(valor: unknown): string | null {
  if (typeof valor !== "string") return null
  const limpio = valor.trim()
  return limpio === "" ? null : limpio
}

function asignarSiVieneDato(
  updates: Record<string, unknown>,
  key: string,
  nuevoValor: unknown,
  valorActual: unknown
) {
  if (nuevoValor === null || nuevoValor === undefined) return
  if (typeof nuevoValor === "string" && nuevoValor.trim() === "") return
  if (nuevoValor !== valorActual) {
    updates[key] = nuevoValor
  }
}

// POST /api/mensajes/pasar-arrendatario
// Automatización completa: Toma un registro de arrenlex_form_intake y lo convierte en arrendatario + contrato
// 
// FLUJO AUTOMATIZADO:
//   1. Detecta si hay un coarrendatario con el mismo grupo_solicitud_id
//   2. Si hay, crea UN arrendatario con AMBOS datos (principal + coarrendatario)
//   3. Crea UN contrato en estado "borrador"
//   4. Marca AMBOS registros de intake como completados
//   5. El contrato aparece automáticamente en el dashboard del propietario
//
// Si no hay coarrendatario, funciona igual pero con solo una persona.
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
    console.error("[pasar-arrendatario] Error obteniendo intake:", intakeError)
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
  }

  console.log("[pasar-arrendatario] Intake encontrado:", {
    id: intake.id,
    nombre: intake.nombre,
    grupo_solicitud_id: intake.grupo_solicitud_id,
    tipo_solicitante: intake.tipo_solicitante,
  })

  // ── 1.1. Detectar si hay un coarrendatario en el mismo grupo ─────────────
  let intakeCoarrendatario: any = null
  let intakeCoarrendatarioId: string | null = null
  
  // MÉTODO 1: Buscar por grupo_solicitud_id (si existe y no es null)
  if (intake.grupo_solicitud_id && intake.grupo_solicitud_id.trim() !== "") {
    console.log("[pasar-arrendatario] Buscando coarrendatario con grupo_solicitud_id:", intake.grupo_solicitud_id)
    
    const { data: registrosDelGrupo, error: grupoError } = await admin
      .from("arrenlex_form_intake")
      .select("*")
      .eq("grupo_solicitud_id", intake.grupo_solicitud_id)
      .neq("id", intakeId) // Excluir el registro actual

    if (grupoError) {
      console.error("[pasar-arrendatario] Error buscando grupo:", grupoError)
    }

    console.log("[pasar-arrendatario] Registros del grupo encontrados:", registrosDelGrupo?.length ?? 0)

    if (registrosDelGrupo && registrosDelGrupo.length > 0) {
      console.log("[pasar-arrendatario] Registros del grupo:", registrosDelGrupo.map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        tipo_solicitante: r.tipo_solicitante,
      })))

      // Buscar un registro con tipo_solicitante diferente
      intakeCoarrendatario = registrosDelGrupo.find(
        (r: any) => r.tipo_solicitante && r.tipo_solicitante !== intake.tipo_solicitante
      ) ?? registrosDelGrupo[0]
      intakeCoarrendatarioId = intakeCoarrendatario?.id ?? null

      console.log("[pasar-arrendatario] Coarrendatario seleccionado por grupo:", {
        id: intakeCoarrendatario?.id,
        nombre: intakeCoarrendatario?.nombre,
        tipo_solicitante: intakeCoarrendatario?.tipo_solicitante,
      })
    } else {
      console.log("[pasar-arrendatario] No hay registros adicionales en el grupo (método 1)")
    }
  } else {
    console.log("[pasar-arrendatario] grupo_solicitud_id es null/vacío - probando método alternativo")
  }

  // MÉTODO 2: Si método 1 no funcionó, buscar por mismo dia y propiedad (fallback para datos antiguos)
  if (!intakeCoarrendatario) {
    console.log("[pasar-arrendatario] Intentando método 2: buscar por misma propiedad, mismo día y tipo diferente")

    const fechaIntake = intake.fecha_envio || intake.created_at
    const fechaDia = fechaIntake.split("T")[0] // YYYY-MM-DD

    const { data: posiblesCoarrendatarios } = await admin
      .from("arrenlex_form_intake")
      .select("*")
      .eq("propiedad_id", intake.propiedad_id)
      .gte("created_at", `${fechaDia}T00:00:00`)
      .lt("created_at", `${fechaDia}T23:59:59`)
      .neq("id", intakeId)
      .order("created_at", { ascending: true })

    if (posiblesCoarrendatarios && posiblesCoarrendatarios.length > 0) {
      console.log("[pasar-arrendatario] Encontrados", posiblesCoarrendatarios.length, "registros del mismo día en propiedad")

      // Preferencia: buscar con tipo_solicitante diferente
      intakeCoarrendatario = posiblesCoarrendatarios.find(
        (r: any) => r.tipo_solicitante && r.tipo_solicitante !== intake.tipo_solicitante
      ) ?? posiblesCoarrendatarios[0]
      
      intakeCoarrendatarioId = intakeCoarrendatario?.id ?? null

      console.log("[pasar-arrendatario] Coarrendatario seleccionado por método 2:", {
        id: intakeCoarrendatario?.id,
        nombre: intakeCoarrendatario?.nombre,
        tipo_solicitante: intakeCoarrendatario?.tipo_solicitante,
      })
    } else {
      console.log("[pasar-arrendatario] No hay otros registros del mismo día - solo hay una persona")
    }
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
    .select(`
      id,
      email,
      nombre,
      cedula,
      cedula_ciudad_expedicion,
      telefono,
      celular,
      adultos_habitantes,
      ninos_habitantes,
      mascotas_cantidad,
      salario_principal,
      salario_secundario,
      empresa_principal,
      empresa_secundaria,
      tiempo_servicio_principal_meses,
      tiempo_servicio_secundario_meses,
      coarrendatario_nombre,
      coarrendatario_cedula,
      coarrendatario_telefono,
      coarrendatario_cedula_expedicion,
      coarrendatario_email,
      autorizacion_datos,
      contratos(id, estado)
    `)
    .eq("email", emailTrimmed)
    .maybeSingle()

  let arrendatarioId: string
  let tieneContratoVigenteOBorrador = false

  // Si detectamos un coarrendatario, usar sus datos en los campos coarrendatario_*
  const coarrendatarioNombre = normalizarTexto(intakeCoarrendatario?.nombre) ?? normalizarTexto(intake.coarrendatario_nombre)
  const coarrendatarioCedula = normalizarTexto(intakeCoarrendatario?.cedula) ?? normalizarTexto(intake.coarrendatario_cedula)
  const coarrendatarioTelefono = normalizarTexto(intakeCoarrendatario?.telefono) ?? normalizarTexto(intake.coarrendatario_telefono)
  const coarrendatarioCedulaExpedicion = normalizarTexto(intakeCoarrendatario?.cedula_ciudad_expedicion) ?? normalizarTexto(intake.coarrendatario_cedula_expedicion)
  const coarrendatarioEmail = normalizarTexto(intakeCoarrendatario?.email)?.toLowerCase() ?? normalizarTexto(intake.coarrendatario_email)?.toLowerCase() ?? null

  if (arrendatarioExistente) {
    // Ya existe el arrendatario, usar su ID
    arrendatarioId = arrendatarioExistente.id

    // Verificar si ya tiene contrato activo o borrador
    tieneContratoVigenteOBorrador = arrendatarioExistente.contratos?.some(
      (c: any) => c.estado === "activo" || c.estado === "borrador"
    )

    // Siempre sincronizar datos faltantes/actualizados, incluyendo coarrendatario.
    // Esto evita que el segundo solicitante se pierda cuando el principal ya existía.
    const updates: Record<string, unknown> = {}
    asignarSiVieneDato(updates, "nombre", nombreTrimmed, arrendatarioExistente.nombre)
    asignarSiVieneDato(updates, "email", emailTrimmed, arrendatarioExistente.email)
    asignarSiVieneDato(updates, "cedula", normalizarTexto(intake.cedula), arrendatarioExistente.cedula)
    asignarSiVieneDato(updates, "cedula_ciudad_expedicion", normalizarTexto(intake.cedula_ciudad_expedicion), arrendatarioExistente.cedula_ciudad_expedicion)
    asignarSiVieneDato(updates, "telefono", normalizarTexto(intake.telefono), arrendatarioExistente.telefono)
    asignarSiVieneDato(updates, "celular", normalizarTexto(intake.telefono), arrendatarioExistente.celular)
    asignarSiVieneDato(updates, "adultos_habitantes", intake.adultos_habitantes ?? null, arrendatarioExistente.adultos_habitantes)
    asignarSiVieneDato(updates, "ninos_habitantes", intake.ninos_habitantes ?? null, arrendatarioExistente.ninos_habitantes)
    asignarSiVieneDato(updates, "mascotas_cantidad", intake.mascotas_cantidad ?? null, arrendatarioExistente.mascotas_cantidad)
    asignarSiVieneDato(updates, "salario_principal", intake.salario_principal ?? null, arrendatarioExistente.salario_principal)
    asignarSiVieneDato(updates, "salario_secundario", intakeCoarrendatario?.salario_principal ?? intake.salario_secundario ?? null, arrendatarioExistente.salario_secundario)
    asignarSiVieneDato(updates, "empresa_principal", normalizarTexto(intake.empresa_principal), arrendatarioExistente.empresa_principal)
    asignarSiVieneDato(updates, "empresa_secundaria", normalizarTexto(intakeCoarrendatario?.empresa_principal) ?? normalizarTexto(intake.empresa_secundaria), arrendatarioExistente.empresa_secundaria)
    asignarSiVieneDato(updates, "tiempo_servicio_principal_meses", intake.tiempo_servicio_principal_meses ?? null, arrendatarioExistente.tiempo_servicio_principal_meses)
    asignarSiVieneDato(updates, "tiempo_servicio_secundario_meses", intakeCoarrendatario?.tiempo_servicio_principal_meses ?? intake.tiempo_servicio_secundario_meses ?? null, arrendatarioExistente.tiempo_servicio_secundario_meses)
    asignarSiVieneDato(updates, "coarrendatario_nombre", coarrendatarioNombre, arrendatarioExistente.coarrendatario_nombre)
    asignarSiVieneDato(updates, "coarrendatario_cedula", coarrendatarioCedula, arrendatarioExistente.coarrendatario_cedula)
    asignarSiVieneDato(updates, "coarrendatario_telefono", coarrendatarioTelefono, arrendatarioExistente.coarrendatario_telefono)
    asignarSiVieneDato(updates, "coarrendatario_cedula_expedicion", coarrendatarioCedulaExpedicion, arrendatarioExistente.coarrendatario_cedula_expedicion)
    asignarSiVieneDato(updates, "coarrendatario_email", coarrendatarioEmail, arrendatarioExistente.coarrendatario_email)
    asignarSiVieneDato(
      updates,
      "autorizacion_datos",
      typeof intake.autorizacion === "string" &&
        (intake.autorizacion.toLowerCase().includes("si") ||
          intake.autorizacion.toLowerCase().includes("sí")),
      arrendatarioExistente.autorizacion_datos
    )

    if (Object.keys(updates).length > 0) {
      const { error: updateArrendatarioError } = await admin
        .from("arrendatarios")
        .update(updates)
        .eq("id", arrendatarioId)

      if (updateArrendatarioError) {
        console.error("[pasar-arrendatario] Error actualizando arrendatario existente:", updateArrendatarioError)
        return NextResponse.json(
          { error: updateArrendatarioError.message || "Error al actualizar arrendatario existente" },
          { status: 500 }
        )
      }
    }
  } else {
    // ── 3. Crear arrendatario (SIN usuario en Auth) ───────────────────────

    console.log("[pasar-arrendatario] Creando arrendatario con datos:", {
      nombre: nombreTrimmed,
      email: emailTrimmed,
      coarrendatario_nombre: coarrendatarioNombre,
      coarrendatario_email: coarrendatarioEmail,
      salario_principal: intake.salario_principal,
      salario_secundario: intakeCoarrendatario?.salario_principal ?? intake.salario_secundario,
    })

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
        salario_secundario: intakeCoarrendatario?.salario_principal ?? intake.salario_secundario ?? null,
        empresa_principal: intake.empresa_principal ?? null,
        empresa_secundaria: intakeCoarrendatario?.empresa_principal ?? intake.empresa_secundaria ?? null,
        tiempo_servicio_principal_meses: intake.tiempo_servicio_principal_meses ?? null,
        tiempo_servicio_secundario_meses: intakeCoarrendatario?.tiempo_servicio_principal_meses ?? intake.tiempo_servicio_secundario_meses ?? null,

        // Coarrendatario - usar datos del registro del coarrendatario si existe
        coarrendatario_nombre: coarrendatarioNombre,
        coarrendatario_cedula: coarrendatarioCedula,
        coarrendatario_telefono: coarrendatarioTelefono,
        coarrendatario_cedula_expedicion: coarrendatarioCedulaExpedicion,
        coarrendatario_email: coarrendatarioEmail,

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

    console.log("[pasar-arrendatario] Arrendatario creado exitosamente:", newArrendatario.id)
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
  if (!tieneContratoVigenteOBorrador) {
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
  }

  // ── 6. Marcar intakes como completados ─────────────────────────────────
  // Marcar el intake principal como completado
  await admin
    .from("arrenlex_form_intake")
    .update({ 
      gestionado: true,
      completado: true,
      completado_at: new Date().toISOString()
    })
    .eq("id", intakeId)

  // Si hay coarrendatario, marcar también como completado
  if (intakeCoarrendatarioId) {
    await admin
      .from("arrenlex_form_intake")
      .update({ 
        gestionado: true,
        completado: true,
        completado_at: new Date().toISOString()
      })
      .eq("id", intakeCoarrendatarioId)
  }

  const tieneCoarrendatario = !!intakeCoarrendatario
  return NextResponse.json({
    ok: true,
    arrendatarioId,
    email: emailTrimmed,
    nombre: nombreTrimmed,
    yaExiste: !!arrendatarioExistente,
    yaTeniaContrato: tieneContratoVigenteOBorrador,
    tieneCoarrendatario,
    coarrendatarioNombre: intakeCoarrendatario?.nombre ?? null,
    message: tieneContratoVigenteOBorrador
      ? `✓ Se actualizaron los datos del arrendatario existente${tieneCoarrendatario ? " incluyendo coarrendatario" : ""}. Ya tenía un contrato activo o borrador.`
      : tieneCoarrendatario
      ? `✓ Contrato creado exitosamente para ${nombreTrimmed} + ${intakeCoarrendatario?.nombre ?? "Coarrendatario"}. Ambos registros han sido marcados como completados.`
      : `✓ Arrendatario creado exitosamente. Ahora puedes editar los datos en Reportes de Personas.`,
  })
}
