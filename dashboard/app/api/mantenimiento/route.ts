import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { sendMantenimientoEmail } from "@/lib/email/send-mantenimiento"

/**
 * GET - Lista solicitudes de mantenimiento.
 * Admin: todas. Propietario: solo las de sus propiedades.
 * Requiere sesión; rechaza a inquilinos.
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
  if (role === "inquilino") {
    return NextResponse.json({ error: "No autorizado para ver mantenimiento" }, { status: 403 })
  }

  const admin = createAdminClient()

  if (role === "admin") {
    const { data, error } = await admin
      .from("solicitudes_mantenimiento")
      .select(
        `
        id,
        propiedad_id,
        nombre_completo,
        detalle,
        desde_cuando,
        responsable,
        status,
        arrendatario_id,
        created_at,
        propiedades ( id, direccion, ciudad, barrio )
      `
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[mantenimiento GET]", error)
      return NextResponse.json({ error: "Error al listar solicitudes" }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  }

  // propietario: solo propiedades donde user_id = user.id
  const { data: propIds } = await admin
    .from("propiedades")
    .select("id")
    .eq("user_id", user.id)

  const ids = (propIds ?? []).map((p) => p.id)
  if (ids.length === 0) {
    return NextResponse.json([])
  }

  const { data, error } = await admin
    .from("solicitudes_mantenimiento")
    .select(
      `
      id,
      propiedad_id,
      nombre_completo,
      detalle,
      desde_cuando,
      responsable,
      status,
      arrendatario_id,
      created_at,
      propiedades ( id, direccion, ciudad, barrio )
    `
    )
    .in("propiedad_id", ids)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[mantenimiento GET]", error)
    return NextResponse.json({ error: "Error al listar solicitudes" }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

/**
 * POST - Crea una solicitud de mantenimiento.
 * Inquilino: nombre_completo, detalle, desde_cuando, propiedad_id (opcional si tiene un solo contrato activo).
 * Admin / Propietario: nombre_completo, detalle, desde_cuando, propiedad_id (obligatorio).
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "inquilino" && role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado para crear solicitudes de mantenimiento" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { nombre_completo, detalle, desde_cuando, propiedad_id } = body as Record<string, unknown>

  if (
    typeof nombre_completo !== "string" ||
    typeof detalle !== "string" ||
    typeof desde_cuando !== "string"
  ) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: nombre_completo, detalle, desde_cuando" },
      { status: 400 }
    )
  }

  const nombreTrim = nombre_completo.trim()
  const detalleTrim = detalle.trim()
  const desdeCuandoTrim = desde_cuando.trim()

  if (!nombreTrim || !detalleTrim || !desdeCuandoTrim) {
    return NextResponse.json(
      { error: "nombre_completo, detalle y desde_cuando no pueden estar vacíos" },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  let propiedadId: string
  let arrendatarioId: string | null = null

  if (role === "admin" || role === "propietario") {
    const idTrim = typeof propiedad_id === "string" ? propiedad_id.trim() : ""
    if (!idTrim) {
      return NextResponse.json(
        { error: "Debes indicar la propiedad (propiedad_id)" },
        { status: 400 }
      )
    }
    const { data: propiedad, error: errProp } = await admin
      .from("propiedades")
      .select("id, user_id, direccion, ciudad")
      .eq("id", idTrim)
      .single()

    if (errProp || !propiedad) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
    }
    if (role === "propietario" && (propiedad as { user_id: string }).user_id !== user.id) {
      return NextResponse.json(
        { error: "Solo puedes reportar mantenimiento de tus propias propiedades" },
        { status: 403 }
      )
    }
    propiedadId = idTrim
  } else {
    // Inquilino: resolver por contratos activos
    const { data: arrendatario, error: errArr } = await admin
      .from("arrendatarios")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (errArr || !arrendatario) {
      return NextResponse.json(
        { error: "No se encontró perfil de arrendatario. Debes tener un contrato activo." },
        { status: 403 }
      )
    }
    arrendatarioId = arrendatario.id

    const { data: contratos, error: errContratos } = await admin
      .from("contratos")
      .select("propiedad_id")
      .eq("arrendatario_id", arrendatario.id)
      .eq("estado", "activo")

    if (errContratos || !contratos?.length) {
      return NextResponse.json(
        { error: "No tienes contratos activos. Solo puedes reportar mantenimiento de tu vivienda actual." },
        { status: 403 }
      )
    }

    const propiedadIds = contratos.map((c) => c.propiedad_id)
    if (typeof propiedad_id === "string" && propiedad_id.trim()) {
      const idTrim = propiedad_id.trim()
      if (!propiedadIds.includes(idTrim)) {
        return NextResponse.json(
          { error: "La propiedad no corresponde a uno de tus contratos activos" },
          { status: 400 }
        )
      }
      propiedadId = idTrim
    } else if (propiedadIds.length === 1) {
      propiedadId = propiedadIds[0]
    } else {
      return NextResponse.json(
        { error: "Tienes más de un contrato activo; debes indicar propiedad_id" },
        { status: 400 }
      )
    }
  }

  const { data: propiedad, error: errProp } = await admin
    .from("propiedades")
    .select("id, direccion, ciudad")
    .eq("id", propiedadId)
    .single()

  if (errProp || !propiedad) {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  const { data: inserted, error: errInsert } = await admin
    .from("solicitudes_mantenimiento")
    .insert({
      propiedad_id: propiedadId,
      nombre_completo: nombreTrim,
      detalle: detalleTrim,
      desde_cuando: desdeCuandoTrim,
      status: "pendiente",
      arrendatario_id: arrendatarioId,
    })
    .select("id")
    .single()

  if (errInsert) {
    console.error("[mantenimiento POST]", errInsert)
    return NextResponse.json({ error: "Error al guardar la solicitud" }, { status: 500 })
  }

  const solicitudId = inserted?.id

  // === INICIO: Asignar responsable y obtener emails para notificaciones ===

  // 1. Buscar usuario con perfil maintenance_special activo para asignarlo
  const { data: maintenanceUser, error: errMaintenance } = await admin
    .from("perfiles")
    .select("id, email, nombre")
    .eq("role", "maintenance_special")
    .eq("activo", true)
    .limit(1)
    .maybeSingle()

  let assignedToUserId: string | null = null
  let mantenimientoEmail: string | undefined
  let mantenimientoNombre: string | undefined

  if (maintenanceUser && !errMaintenance) {
    assignedToUserId = maintenanceUser.id
    mantenimientoEmail = maintenanceUser.email
    mantenimientoNombre = maintenanceUser.nombre || undefined

    // Actualizar la solicitud con el responsable asignado
    await admin
      .from("solicitudes_mantenimiento")
      .update({
        assigned_to: assignedToUserId,
        responsable: maintenanceUser.nombre || "Especialista Mantenimiento"
      })
      .eq("id", solicitudId)

    console.log("[mantenimiento] Asignado a maintenance_special:", maintenanceUser.email)
  } else {
    console.warn("[mantenimiento] No se encontró usuario con perfil maintenance_special activo")
  }

  // 2. Obtener email del propietario de la propiedad
  let propietarioEmail: string | undefined
  let propietarioNombre: string | undefined

  const { data: propietarioUser, error: errPropietario } = await admin
    .from("propiedades")
    .select("user_id")
    .eq("id", propiedadId)
    .single()

  if (propietarioUser && !errPropietario) {
    // Obtener email desde auth.users usando el admin client
    const { data: authUser, error: errAuth } = await admin.auth.admin.getUserById(propietarioUser.user_id)
    if (!errAuth && authUser) {
      propietarioEmail = authUser.user.email
      // Obtener nombre del perfil del propietario
      const { data: perfilPropietario } = await admin
        .from("perfiles")
        .select("nombre")
        .eq("id", propietarioUser.user_id)
        .maybeSingle()
      propietarioNombre = perfilPropietario?.nombre || authUser.user.user_metadata?.nombre || undefined
      console.log("[mantenimiento] Propietario encontrado:", propietarioEmail)
    }
  }

  // 3. Obtener emails de administradores (todos los usuarios con rol admin)
  const { data: adminUsers, error: errAdmins } = await admin
    .from("perfiles")
    .select("id, email, nombre")
    .eq("role", "admin")
    .eq("activo", true)

  const adminsData: Array<{ email: string; nombre?: string }> = []
  if (!errAdmins && adminUsers && adminUsers.length > 0) {
    for (const adminUser of adminUsers) {
      if (adminUser.email) {
        adminsData.push({
          email: adminUser.email,
          nombre: adminUser.nombre || undefined
        })
      }
    }
    console.log("[mantenimiento] Admins encontrados:", adminsData.map(a => a.email).join(", "))
  }

  // === FIN: Asignar responsable y obtener emails para notificaciones ===

  // Enviar correos a todos los destinatarios
  const propiedadRef = [propiedad.direccion, propiedad.ciudad].filter(Boolean).join(", ") || propiedadId
  const emailResult = await sendMantenimientoEmail({
    nombreCompleto: nombreTrim,
    detalle: detalleTrim,
    desdeCuando: desdeCuandoTrim,
    propiedadRef,
    propietarioEmail,
    propietarioNombre,
    mantenimientoEmail,
    mantenimientoNombre,
    admins: adminsData.length > 0 ? adminsData : undefined,
  })

  if (!emailResult.success) {
    console.error("[mantenimiento] Email no enviado:", emailResult.error)
  } else {
    console.log("[mantenimiento] Correos enviados a:", emailResult.sentTo?.join(", "))
  }

  return NextResponse.json({
    id: solicitudId,
    message: emailResult.success
      ? "Solicitud de mantenimiento enviada correctamente"
      : "Solicitud guardada. No se pudo enviar la notificación por correo.",
    emailSent: emailResult.success,
    sentTo: emailResult.sentTo,
    assignedTo: assignedToUserId,
  })
}
