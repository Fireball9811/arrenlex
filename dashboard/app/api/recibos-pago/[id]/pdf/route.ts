import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

export async function GET(
  request: Request,
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
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Obtener el recibo con su propiedad
  const { data: recibo, error: fetchError } = await admin
    .from("recibos_pago")
    .select(`
      *,
      propiedad:propiedades(direccion, ciudad, barrio, user_id)
    `)
    .eq("id", id)
    .single()

  if (fetchError || !recibo) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }

  // Si es propietario, verificar que la propiedad pertenezca al usuario
  if (role === "propietario") {
    const propiedad = recibo.propiedad as any
    if (!propiedad || propiedad.user_id !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para ver este recibo" }, { status: 403 })
    }
  }

  // Cambiar estado a completado al descargar el PDF
  await admin
    .from("recibos_pago")
    .update({ estado: "completado" })
    .eq("id", id)

  // Generar HTML del recibo completamente aislado
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo ${recibo.numero_recibo || recibo.id}</title>
  <style>
    /* Reset completo para aislar de estilos externos */
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: white !important;
      font-family: 'Arial', 'Helvetica', sans-serif !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      color: #333 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Eliminar cualquier elemento externo */
    body > *:not(.recibo-container) {
      display: none !important;
    }

    .recibo-container {
      all: initial;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #333;
      background: white;
    }

    .recibo-header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }

    .recibo-header h1 {
      font-size: 24px;
      margin: 0 0 10px 0;
      color: #333;
    }

    .recibo-header p {
      font-size: 12px;
      color: #666;
      margin: 0;
    }

    .recibo-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }

    .recibo-info-box {
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 4px;
      background: white;
    }

    .recibo-info-box h3 {
      font-size: 14px;
      margin: 0 0 10px 0;
      color: #555;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
    }

    .recibo-info-box p {
      margin: 0 0 5px 0;
      font-size: 13px;
    }

    .recibo-info-box strong {
      display: inline-block;
      width: 100px;
      font-weight: 600;
    }

    .recibo-amount-box {
      background: #f8f9fa;
      padding: 25px;
      text-align: center;
      border-radius: 4px;
      margin: 30px 0;
      border: 1px solid #dee2e6;
    }

    .recibo-amount {
      font-size: 36px;
      font-weight: bold;
      color: #1a365d;
      margin: 0;
    }

    .recibo-amount-words {
      font-size: 14px;
      color: #666;
      margin-top: 10px;
      font-style: italic;
    }

    .recibo-details {
      margin: 30px 0;
    }

    .recibo-details table {
      width: 100%;
      border-collapse: collapse;
    }

    .recibo-details td {
      padding: 12px 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    .recibo-details td:first-child {
      font-weight: 600;
      width: 40%;
      color: #374151;
    }

    .recibo-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #666;
      text-align: center;
    }

    .recibo-footer p {
      margin: 5px 0;
    }

    .recibo-signature-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      margin-top: 80px;
    }

    .recibo-signature {
      text-align: center;
    }

    .recibo-signature-line {
      border-top: 1px solid #333;
      margin-top: 70px;
      padding-top: 10px;
      font-weight: 600;
      color: #333;
    }

    .recibo-signature p {
      margin: 5px 0 0 0;
      font-size: 12px;
      color: #666;
    }

    /* Estilos para impresión */
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
      }

      .recibo-container {
        margin: 20px !important;
        padding: 0 !important;
        max-width: 100% !important;
      }

      .recibo-signature-box {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="recibo-container">
    <div class="recibo-header">
      <h1>RECIBO DE PAGO</h1>
      <p>No. ${recibo.numero_recibo || 'N/A'} | Fecha: ${new Date(recibo.fecha_recibo).toLocaleDateString('es-CO')}</p>
    </div>

    <div class="recibo-info-grid">
      <div class="recibo-info-box">
        <h3>ARRENDATARIO (PAGADOR)</h3>
        <p><strong>Nombre:</strong> ${recibo.arrendador_nombre || 'N/A'}</p>
        <p><strong>Cédula:</strong> ${recibo.arrendador_cedula || 'N/A'}</p>
      </div>
      <div class="recibo-info-box">
        <h3>PROPIETARIO (RECEPTOR)</h3>
        <p><strong>Nombre:</strong> ${recibo.propietario_nombre || 'N/A'}</p>
        <p><strong>Cédula:</strong> ${recibo.propietario_cedula || 'N/A'}</p>
      </div>
    </div>

    <div class="recibo-info-box">
      <h3>INMUEBLE</h3>
      <p><strong>Dirección:</strong> ${recibo.propiedad?.direccion || 'N/A'}</p>
      <p><strong>Barrio:</strong> ${recibo.propiedad?.barrio || 'N/A'}</p>
      <p><strong>Ciudad:</strong> ${recibo.propiedad?.ciudad || 'N/A'}</p>
    </div>

    <div class="recibo-amount-box">
      <p class="recibo-amount">$ ${Number(recibo.valor_arriendo || 0).toLocaleString('es-CO')}</p>
      <p class="recibo-amount-words">${recibo.valor_arriendo_letras || ''}</p>
    </div>

    <div class="recibo-details">
      <table>
        <tr>
          <td>Concepto de Pago:</td>
          <td>${recibo.tipo_pago === 'arriendo' ? 'Canon de Arrendamiento' : recibo.tipo_pago === 'deposito' ? 'Depósito' : recibo.tipo_pago === 'servicios' ? 'Servicios Públicos' : recibo.tipo_pago || 'N/A'}</td>
        </tr>
        <tr>
          <td>Período Cancelado:</td>
          <td>Del ${recibo.fecha_inicio_periodo ? new Date(recibo.fecha_inicio_periodo).toLocaleDateString('es-CO') : 'N/A'} al ${recibo.fecha_fin_periodo ? new Date(recibo.fecha_fin_periodo).toLocaleDateString('es-CO') : 'N/A'}</td>
        </tr>
        ${recibo.cuenta_consignacion ? `
        <tr>
          <td>Cuenta Consignación:</td>
          <td>${recibo.cuenta_consignacion}</td>
        </tr>
        ` : ''}
        ${recibo.referencia_pago ? `
        <tr>
          <td>Referencia de Pago:</td>
          <td>${recibo.referencia_pago}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${recibo.nota ? `
    <div class="recibo-info-box">
      <h3>NOTAS ADICIONALES</h3>
      <p>${recibo.nota}</p>
    </div>
    ` : ''}

    <div class="recibo-footer">
      <p>Este recibo constituye prueba válida de pago correspondiente al período especificado.</p>
      <p>Fecha de expedición: ${new Date().toLocaleDateString('es-CO')}</p>
    </div>

    <div class="recibo-signature-box">
      <div class="recibo-signature">
        <div class="recibo-signature-line">${recibo.arrendador_nombre || ''}</div>
        <p>ARRENDATARIO (PAGADOR)</p>
      </div>
      <div class="recibo-signature">
        <div class="recibo-signature-line">${recibo.propietario_nombre || ''}</div>
        <p>PROPIETARIO (RECEPTOR)</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  // Retornar el HTML que se puede imprimir/guardar como PDF
  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="Recibo_${recibo.numero_recibo || id}.pdf"`,
    },
  })
}
