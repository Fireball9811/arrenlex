import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import jsPDF from "jspdf"
import { llenarPlantillaContrato } from "@/lib/utils/contrato-template"

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Generar PDF del contrato
export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params

  // Obtener datos del contrato desde la función de Supabase
  const { data: contratoData, error } = await supabase
    .rpc('obtener_datos_contrato', { p_contrato_id: id })

  if (error) {
    console.error("Error obteniendo datos del contrato:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!contratoData || contratoData.length === 0) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  const datos = contratoData[0] as any

  // Llenar la plantilla con los datos
  const contratoTexto = llenarPlantillaContrato(datos)

  try {
    // Crear PDF
    const doc = new jsPDF({
      unit: 'mm',
      format: 'letter'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - (margin * 2)
    let yPosition = margin
    const lineHeight = 6
    const fontSize = 10

    doc.setFontSize(fontSize)
    doc.setFont("helvetica", "normal")

    // Título del contrato centrado
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    const titulo = "CONTRATO DE ARRENDAMIENTO"
    const tituloWidth = doc.getTextWidth(titulo)
    doc.text(titulo, (pageWidth - tituloWidth) / 2, yPosition)
    yPosition += 15

    doc.setFontSize(fontSize)
    doc.setFont("helvetica", "normal")

    // Procesar el texto del contrato
    const lineas = contratoTexto.split('\n')

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim()

      // Saltar líneas vacías (pero con un pequeño espacio)
      if (!linea) {
        yPosition += 3
        continue
      }

      // Detectar cláusulas (números romanos o palabras como CLAUSULA)
      const esCláusula = /^(CLÁUSULA|CLAUSULA|Parágrafo|PARÁGRAFO)/.test(linea) ||
                        /^[IVX]+\.\s+/.test(linea) ||
                        /^[IVX]+\.\s+–\s+/.test(linea)

      if (esCláusula) {
        // Espacio antes de cada cláusula
        yPosition += 5
        doc.setFont("helvetica", "bold")
        doc.setFontSize(fontSize + 1)
      }

      // Dividir líneas largas
      const palabras = linea.split(' ')
      let lineaActual = ''

      for (const palabra of palabras) {
        const lineaTemporal = lineaActual ? lineaActual + ' ' + palabra : palabra
        const lineWidth = doc.getTextWidth(lineaTemporal)

        if (lineWidth > maxWidth && lineaActual) {
          // Escribir la línea actual
          doc.text(lineaActual, margin, yPosition)
          yPosition += lineHeight
          lineaActual = palabra
        } else {
          lineaActual = lineaTemporal
        }
      }

      // Escribir lo que queda
      if (lineaActual) {
        doc.text(lineaActual, margin, yPosition)
        yPosition += lineHeight
      }

      // Restaurar fuente normal después de cláusula
      if (esCláusula) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(fontSize)
        yPosition += 3
      }

      // Nueva página si es necesario
      if (yPosition > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }
    }

    // Generar el PDF como buffer
    const pdfBytes = doc.output('arraybuffer')

    // Retornar el PDF como respuesta
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contrato-arrendamiento-${id}.pdf"`,
      },
    })

  } catch (e) {
    console.error("Error generando PDF:", e)
    return NextResponse.json(
      { error: "Error al generar el PDF" },
      { status: 500 }
    )
  }
}
