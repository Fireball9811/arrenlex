import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

  const admin = createAdminClient()

  // Obtener el recibo con información de propiedad
  const { data: recibo, error } = await admin
    .from("recibos_pago")
    .select(`
      *,
      propiedad:propiedades(direccion, ciudad, barrio)
    `)
    .eq("id", id)
    .single()

  if (error || !recibo) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }

  // Generar HTML del recibo
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header p { font-size: 12px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 4px; }
    .info-box h3 { font-size: 14px; margin-bottom: 10px; color: #555; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .info-box p { margin-bottom: 5px; }
    .info-box strong { display: inline-block; width: 100px; }
    .amount-box { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 4px; margin: 30px 0; }
    .amount-box .amount { font-size: 32px; font-weight: bold; color: #2c5282; }
    .amount-box .amount-words { font-size: 14px; color: #666; margin-top: 10px; font-style: italic; }
    .details { margin: 30px 0; }
    .details table { width: 100%; border-collapse: collapse; }
    .details td { padding: 10px; border-bottom: 1px solid #eee; }
    .details td:first-child { font-weight: bold; width: 40%; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .signature-box { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
    .signature { text-align: center; }
    .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RECIBO DE PAGO</h1>
      <p>No. ${recibo.numero_recibo || 'N/A'} | Fecha: ${new Date(recibo.fecha_recibo).toLocaleDateString('es-CO')}</p>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h3>PROPIETARIO (PAGADOR)</h3>
        <p><strong>Nombre:</strong> ${recibo.propietario_nombre || 'N/A'}</p>
        <p><strong>Cédula:</strong> ${recibo.propietario_cedula || 'N/A'}</p>
      </div>
      <div class="info-box">
        <h3>ARRENDATARIO (RECEPTOR)</h3>
        <p><strong>Nombre:</strong> ${recibo.arrendador_nombre || 'N/A'}</p>
        <p><strong>Cédula:</strong> ${recibo.arrendador_cedula || 'N/A'}</p>
      </div>
    </div>

    <div class="info-box">
      <h3>INMUEBLE</h3>
      <p><strong>Dirección:</strong> ${recibo.propiedad?.direccion || 'N/A'}</p>
      <p><strong>Barrio:</strong> ${recibo.propiedad?.barrio || 'N/A'}</p>
      <p><strong>Ciudad:</strong> ${recibo.propiedad?.ciudad || 'N/A'}</p>
    </div>

    <div class="amount-box">
      <div class="amount">$ ${Number(recibo.valor_arriendo || 0).toLocaleString('es-CO')}</div>
      <div class="amount-words">${recibo.valor_arriendo_letras || ''}</div>
    </div>

    <div class="details">
      <table>
        <tr>
          <td>Concepto de Pago:</td>
          <td>${recibo.tipo_pago === 'arriendo' ? 'Canon de Arrendamiento' : recibo.tipo_pago === 'servicios' ? 'Servicios Públicos' : recibo.tipo_pago || 'N/A'}</td>
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
    <div class="info-box">
      <h3>NOTAS ADICIONALES</h3>
      <p>${recibo.nota}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>Este recibo constituye prueba válida de pago del canon de arrendamiento correspondiente al período especificado.</p>
      <p>Fecha de expedición: ${new Date().toLocaleDateString('es-CO')}</p>
    </div>

    <div class="signature-box">
      <div class="signature">
        <div class="signature-line">${recibo.propietario_nombre || ''}</div>
        <p>PROPIETARIO</p>
      </div>
      <div class="signature">
        <div class="signature-line">${recibo.arrendador_nombre || ''}</div>
        <p>ARRENDATARIO</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  // Retornar HTML para que el navegador lo renderice y pueda imprimirse como PDF
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
