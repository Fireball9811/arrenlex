import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST - Envía el recibo por correo electrónico
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "propietario" && role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { correo } = body as Record<string, unknown>

  if (typeof correo !== "string" || !correo.trim()) {
    return NextResponse.json({ error: "El correo es requerido" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Obtener el gasto
  const { data: gasto, error: errGasto } = await admin
    .from("otros_gastos")
    .select(`
      id,
      propiedad_id,
      numero_recibo,
      fecha_emision,
      nombre_completo,
      cedula,
      tarjeta_profesional,
      motivo_pago,
      descripcion_trabajo,
      fecha_realizacion,
      valor,
      banco,
      referencia_pago,
      correo_electronico,
      propiedades ( direccion, ciudad, barrio, titulo ),
      users ( email, nombre )
    `)
    .eq("id", id)
    .single()

  if (errGasto || !gasto) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  // Verificar permisos
  const gastoUsers = gasto.users as any
  const gastoUserEmail = Array.isArray(gastoUsers) ? gastoUsers[0]?.email : gastoUsers?.email

  if (role === "propietario" && gastoUserEmail !== user.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const propiedadData = gasto.propiedades as any
  const propiedad = Array.isArray(propiedadData) ? propiedadData[0] : propiedadData
  const userData = gasto.users as any
  const propietario = Array.isArray(userData) ? userData[0] : userData

  const formatValor = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  // Generar HTML del recibo
  const reciboHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { height: 80px; }
    .titulo { color: #0f766e; font-size: 24px; font-weight: bold; margin: 0; }
    .info-recibo { text-align: right; }
    .numero-recibo { font-size: 20px; font-weight: bold; font-family: monospace; }
    .seccion { margin-bottom: 30px; }
    .label { color: #6b7280; font-size: 14px; margin-bottom: 5px; }
    .valor { font-size: 18px; font-weight: bold; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    .caja-gris { background: #f3f4f6; padding: 15px; border-radius: 8px; }
    .valor-grande { font-size: 32px; font-weight: bold; color: #0f766e; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
    .firma { text-align: center; }
    .linea-firma { border-bottom: 1px dashed #6b7280; margin-bottom: 10px; }
    .estado { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; background: #0f766e; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="titulo">ARRENLEX</h1>
      <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Gestión de Arrendamientos</p>
    </div>
    <div class="info-recibo">
      <p class="label">Recibo No.</p>
      <p class="numero-recibo">${gasto.numero_recibo}</p>
      <p class="label" style="margin-top: 10px;">Fecha de emisión</p>
      <p class="valor">${formatDate(gasto.fecha_emision)}</p>
    </div>
  </div>

  <div class="grid-2 seccion">
    <div>
      <p class="label">Pagado a</p>
      <p class="valor">${gasto.nombre_completo}</p>
      <p style="margin: 5px 0; font-size: 14px;">Cédula: ${gasto.cedula}</p>
      ${gasto.tarjeta_profesional ? `<p style="margin: 5px 0; font-size: 14px;">T.P.: ${gasto.tarjeta_profesional}</p>` : ""}
      ${gasto.correo_electronico ? `<p style="margin: 5px 0; font-size: 14px;">${gasto.correo_electronico}</p>` : ""}
    </div>
    <div>
      <p class="label">Emitido por</p>
      <p class="valor">${propietario?.nombre || propietario?.email || "Propietario"}</p>
      ${propietario?.email ? `<p style="margin: 5px 0; font-size: 14px;">${propietario.email}</p>` : ""}
    </div>
  </div>

  <div class="seccion">
    <p class="label">Por concepto de</p>
    <p class="valor" style="font-size: 20px; margin-bottom: 10px;">${gasto.motivo_pago}</p>
    <p style="color: #6b7280;">${gasto.descripcion_trabajo}</p>
  </div>

  <div class="caja-gris seccion">
    <div class="grid-2">
      <div>
        <p class="label">Propiedad</p>
        <p style="font-weight: 500;">${propiedad?.titulo || `${propiedad?.direccion}, ${propiedad?.ciudad}` || gasto.propiedad_id}</p>
      </div>
      <div>
        <p class="label">Realizado el</p>
        <p style="font-weight: 500;">${formatDate(gasto.fecha_realizacion)}</p>
      </div>
    </div>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;" class="seccion">
    <div style="display: flex; justify-content: space-between; align-items: end;">
      <div>
        <p class="label">Valor</p>
        <p class="valor-grande">${formatValor(gasto.valor)}</p>
      </div>
      ${gasto.banco ? `
      <div style="text-align: right;">
        <p class="label">Banco consignación</p>
        <p style="font-weight: 500;">${gasto.banco}</p>
        ${gasto.referencia_pago ? `<p class="label" style="margin-top: 5px;">Referencia</p><p style="font-family: monospace; font-weight: 500;">${gasto.referencia_pago}</p>` : ""}
      </div>
      ` : ""}
    </div>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;" class="seccion">
    <p class="label">Valor en letras:</p>
    <p style="font-style: italic; font-weight: 500;">${gasto.valor} pesos colombianos</p>
  </div>

  <div class="firmas">
    <div class="firma">
      <div class="linea-firma"></div>
      <p style="font-weight: 500;">Quien recibe el pago</p>
      <p style="font-size: 12px; color: #6b7280;">${gasto.nombre_completo}</p>
      <p style="font-size: 12px; color: #6b7280;">C.C. ${gasto.cedula}</p>
    </div>
    <div class="firma">
      <div class="linea-firma"></div>
      <p style="font-weight: 500;">Quien hace el pago</p>
      <p style="font-size: 12px; color: #6b7280;">${propietario?.nombre || propietario?.email || "Propietario"}</p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <span class="estado">Estado: EMITIDO</span>
  </div>
</body>
</html>
  `

  try {
    const emailFrom = process.env.EMAIL_FROM || "Arrenlex <ceo@arrenlex.com>"

    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: correo.trim(),
      subject: `Recibo de Pago ${gasto.numero_recibo} - Arrenlex`,
      html: reciboHTML,
    })

    if (error) {
      console.error("[otros-gastos enviar-recibo]", error)
      return NextResponse.json({ error: "Error al enviar el correo" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Recibo enviado correctamente",
      data,
    })
  } catch (error) {
    console.error("[otros-gastos enviar-recibo]", error)
    return NextResponse.json({ error: "Error al enviar el correo" }, { status: 500 })
  }
}
