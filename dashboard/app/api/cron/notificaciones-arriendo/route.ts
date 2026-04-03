import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  sendRecordatorio5Dias,
  sendMora1Dia,
  sendSeguimiento3Dias,
  type DestinatarioNotificacion,
} from "@/lib/email/send-notificacion-arriendo"

/**
 * GET /api/cron/notificaciones-arriendo
 *
 * Evalúa todos los contratos activos cuya propiedad tenga notificaciones_email=true
 * y envía los correos correspondientes según la fecha de vencimiento del contrato:
 *
 * - 5 días antes de fecha_fin → recordatorio
 * - 1 día después de fecha_fin (sin recibo emitido) → aviso de mora
 * - Cada 3 días después (sin recibo emitido) → seguimiento
 *
 * Protegido con Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const resultados = {
    procesados: 0,
    recordatorios5Dias: 0,
    mora1Dia: 0,
    seguimientos3Dias: 0,
    errores: [] as string[],
  }

  // Cargar contratos activos con propiedad que tenga notificaciones_email activado
  const { data: contratos, error: errContratos } = await admin
    .from("contratos")
    .select(`
      id,
      fecha_fin,
      arrendatario_id,
      propiedad_id,
      propiedades!inner (
        id,
        direccion,
        notificaciones_email,
        user_id
      ),
      arrendatarios!inner (
        nombre,
        email,
        coarrendatario_email
      )
    `)
    .eq("estado", "activo")
    .eq("propiedades.notificaciones_email", true)

  if (errContratos) {
    console.error("[cron/notificaciones] Error cargando contratos:", errContratos)
    return NextResponse.json({ error: errContratos.message }, { status: 500 })
  }

  if (!contratos || contratos.length === 0) {
    return NextResponse.json({ ...resultados, mensaje: "Sin contratos que procesar" })
  }

  for (const contrato of contratos) {
    resultados.procesados++

    const propiedad = Array.isArray(contrato.propiedades)
      ? contrato.propiedades[0]
      : contrato.propiedades
    const arrendatario = Array.isArray(contrato.arrendatarios)
      ? contrato.arrendatarios[0]
      : contrato.arrendatarios

    if (!propiedad || !arrendatario) continue

    const fechaFin = new Date(contrato.fecha_fin)
    fechaFin.setHours(0, 0, 0, 0)

    const diasDiff = Math.round(
      (fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Obtener email del propietario
    const { data: perfil } = await admin
      .from("perfiles")
      .select("email, nombre")
      .eq("id", propiedad.user_id)
      .single()

    const destinatarios: DestinatarioNotificacion[] = []
    if (perfil?.email) {
      destinatarios.push({ email: perfil.email, nombre: perfil.nombre ?? "Propietario" })
    }
    if (arrendatario.email) {
      destinatarios.push({ email: arrendatario.email, nombre: arrendatario.nombre })
    }
    if (arrendatario.coarrendatario_email) {
      destinatarios.push({
        email: arrendatario.coarrendatario_email,
        nombre: arrendatario.nombre,
      })
    }

    if (destinatarios.length === 0) continue

    const params = {
      destinatarios,
      arrendatarioNombre: arrendatario.nombre,
      propiedadDireccion: propiedad.direccion,
      fechaFin: fechaFin.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }

    // --- CASO 1: Recordatorio 5 días antes ---
    if (diasDiff === 5) {
      const yaEnviado = await notificacionYaEnviada(
        admin,
        contrato.id,
        "recordatorio_5_dias",
        hoy
      )
      if (!yaEnviado) {
        const res = await sendRecordatorio5Dias(params)
        if (res.success) {
          await registrarNotificacion(admin, contrato.id, "recordatorio_5_dias")
          resultados.recordatorios5Dias++
        } else {
          resultados.errores.push(...res.errores)
        }
      }
      continue
    }

    // Solo aplican los siguientes casos cuando ya venció el contrato
    if (diasDiff >= 0) continue

    // Verificar si hay recibo emitido para el período vigente
    const pagado = await tienePagoRegistrado(admin, propiedad.id, fechaFin)
    if (pagado) continue

    // --- CASO 2: Mora 1 día después ---
    if (diasDiff === -1) {
      const yaEnviado = await notificacionYaEnviada(
        admin,
        contrato.id,
        "mora_1_dia",
        hoy
      )
      if (!yaEnviado) {
        const res = await sendMora1Dia(params)
        if (res.success) {
          await registrarNotificacion(admin, contrato.id, "mora_1_dia")
          resultados.mora1Dia++
        } else {
          resultados.errores.push(...res.errores)
        }
      }
      continue
    }

    // --- CASO 3: Seguimiento cada 3 días ---
    if (diasDiff < -1 && Math.abs(diasDiff + 1) % 3 === 0) {
      const ultimoSeguimiento = await ultimaFechaNotificacion(
        admin,
        contrato.id,
        "seguimiento_3_dias"
      )
      const diasDesdeUltimo = ultimoSeguimiento
        ? Math.round((hoy.getTime() - ultimoSeguimiento.getTime()) / (1000 * 60 * 60 * 24))
        : null

      if (diasDesdeUltimo === null || diasDesdeUltimo >= 3) {
        const res = await sendSeguimiento3Dias(params)
        if (res.success) {
          await registrarNotificacion(admin, contrato.id, "seguimiento_3_dias")
          resultados.seguimientos3Dias++
        } else {
          resultados.errores.push(...res.errores)
        }
      }
    }
  }

  console.log("[cron/notificaciones]", resultados)
  return NextResponse.json(resultados)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SupabaseAdmin = ReturnType<typeof createAdminClient>

async function notificacionYaEnviada(
  admin: SupabaseAdmin,
  contratoId: string,
  tipo: string,
  hoy: Date
): Promise<boolean> {
  const inicioDia = hoy.toISOString()
  const finDia = new Date(hoy.getTime() + 24 * 60 * 60 * 1000).toISOString()

  const { data } = await admin
    .from("notificaciones_enviadas")
    .select("id")
    .eq("contrato_id", contratoId)
    .eq("tipo", tipo)
    .gte("fecha_envio", inicioDia)
    .lt("fecha_envio", finDia)
    .limit(1)

  return (data?.length ?? 0) > 0
}

async function ultimaFechaNotificacion(
  admin: SupabaseAdmin,
  contratoId: string,
  tipo: string
): Promise<Date | null> {
  const { data } = await admin
    .from("notificaciones_enviadas")
    .select("fecha_envio")
    .eq("contrato_id", contratoId)
    .eq("tipo", tipo)
    .order("fecha_envio", { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return null
  return new Date(data[0].fecha_envio)
}

async function tienePagoRegistrado(
  admin: SupabaseAdmin,
  propiedadId: string,
  fechaFin: Date
): Promise<boolean> {
  const fechaFinStr = fechaFin.toISOString().split("T")[0]

  const { data } = await admin
    .from("recibos_pago")
    .select("id")
    .eq("propiedad_id", propiedadId)
    .eq("estado", "emitido")
    .gte("fecha_fin_periodo", fechaFinStr)
    .limit(1)

  return (data?.length ?? 0) > 0
}

async function registrarNotificacion(
  admin: SupabaseAdmin,
  contratoId: string,
  tipo: string
): Promise<void> {
  const { error } = await admin
    .from("notificaciones_enviadas")
    .insert({ contrato_id: contratoId, tipo })

  if (error) {
    console.error("[cron/notificaciones] Error registrando notificación:", error)
  }
}
