import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import path from "path"
import fs from "fs"

const INVENTARIO_BASE = path.join(process.cwd(), "public", "inventario-base.pdf")
const LOGO_PATH = path.join(process.cwd(), "public", "Logo.png")

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatNumeroContrato(numero: number | null | undefined): string {
  if (!numero) return ""
  return `CT-${String(numero).padStart(4, "0")}`
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: contrato, error: errContrato } = await admin
    .from("contratos")
    .select("id, user_id, numero, fecha_inicio, arrendatarios ( nombre, cedula ), propiedades ( direccion, ciudad )")
    .eq("id", id)
    .single()

  if (errContrato || !contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  if (role === "propietario" && contrato.user_id !== user.id) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  // Obtener nombre del propietario desde perfiles
  const { data: perfil } = await admin
    .from("perfiles")
    .select("nombre")
    .eq("id", contrato.user_id)
    .single()

  if (!fs.existsSync(INVENTARIO_BASE)) {
    return NextResponse.json(
      { error: "Archivo base no encontrado. Copia inventario-base.pdf a /public/" },
      { status: 404 }
    )
  }

  // Extraer datos del contrato
  const arrendatarioObj = Array.isArray(contrato.arrendatarios)
    ? contrato.arrendatarios[0]
    : (contrato.arrendatarios as { nombre?: string; cedula?: string } | null)
  const propiedadObj = Array.isArray(contrato.propiedades)
    ? contrato.propiedades[0]
    : (contrato.propiedades as { direccion?: string; ciudad?: string } | null)

  const arrendatarioNombre = arrendatarioObj?.nombre ?? ""
  const propietarioNombre = perfil?.nombre ?? ""
  const direccion = [propiedadObj?.direccion, propiedadObj?.ciudad].filter(Boolean).join(", ")
  const numeroContrato = formatNumeroContrato(contrato.numero as number | null)
  const fechaInicio = formatDate(contrato.fecha_inicio as string | null)

  try {
    const pdfLib = await import("pdf-lib")
    const { PDFDocument, rgb, StandardFonts } = pdfLib

    const pdfBytes = fs.readFileSync(INVENTARIO_BASE)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    let logoImage = null
    if (fs.existsSync(LOGO_PATH)) {
      try {
        const logoBytes = fs.readFileSync(LOGO_PATH)
        logoImage = await pdfDoc.embedPng(logoBytes)
      } catch (e) {
        console.warn("[inventario-pdf] No se pudo cargar logo:", e)
      }
    }

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const LOGO_W = 55
    const DARK_BLUE = rgb(0.09, 0.22, 0.44)
    const GRAY = rgb(0.4, 0.4, 0.4)

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const { width, height } = page.getSize()

      // --- Logo (esquina superior izquierda, tamaño reducido) ---
      if (logoImage) {
        const LOGO_H = (logoImage.height / logoImage.width) * LOGO_W
        page.drawImage(logoImage, {
          x: 18,
          y: height - LOGO_H - 10,
          width: LOGO_W,
          height: LOGO_H,
          opacity: 1,
        })
      } else {
        page.drawText("ARRENLEX", {
          x: 18,
          y: height - 28,
          size: 11,
          font: boldFont,
          color: DARK_BLUE,
        })
      }

      // --- Datos del contrato (solo primera página, a la derecha del logo) ---
      if (i === 0) {
        const infoX = LOGO_W + 30
        const infoY = height - 18

        if (numeroContrato) {
          page.drawText(`Contrato: ${numeroContrato}`, {
            x: infoX,
            y: infoY,
            size: 8,
            font: boldFont,
            color: DARK_BLUE,
          })
        }

        if (direccion) {
          page.drawText(`Propiedad: ${direccion}`, {
            x: infoX,
            y: infoY - 12,
            size: 7.5,
            font: regularFont,
            color: GRAY,
          })
        }

        if (fechaInicio) {
          page.drawText(`Fecha inicio: ${fechaInicio}`, {
            x: infoX,
            y: infoY - 23,
            size: 7.5,
            font: regularFont,
            color: GRAY,
          })
        }
      }

      // --- Firmas (solo última página, parte inferior) ---
      if (i === pages.length - 1) {
        const firmaY = 72
        const colIzq = 60
        const colDer = width / 2 + 40
        const lineW = 160

        // Línea izquierda (Propietario)
        page.drawLine({
          start: { x: colIzq, y: firmaY },
          end: { x: colIzq + lineW, y: firmaY },
          thickness: 0.6,
          color: DARK_BLUE,
          opacity: 0.5,
        })
        page.drawText("PROPIETARIO", {
          x: colIzq,
          y: firmaY + 18,
          size: 7,
          font: boldFont,
          color: DARK_BLUE,
        })
        if (propietarioNombre) {
          page.drawText(propietarioNombre, {
            x: colIzq,
            y: firmaY - 10,
            size: 7.5,
            font: boldFont,
            color: DARK_BLUE,
          })
        }

        // Línea derecha (Arrendatario)
        page.drawLine({
          start: { x: colDer, y: firmaY },
          end: { x: colDer + lineW, y: firmaY },
          thickness: 0.6,
          color: DARK_BLUE,
          opacity: 0.5,
        })
        page.drawText("ARRENDATARIO", {
          x: colDer,
          y: firmaY + 18,
          size: 7,
          font: boldFont,
          color: DARK_BLUE,
        })
        if (arrendatarioNombre) {
          page.drawText(arrendatarioNombre, {
            x: colDer,
            y: firmaY - 10,
            size: 7.5,
            font: boldFont,
            color: DARK_BLUE,
          })
        }
      }
    }

    const pdfFinal = await pdfDoc.save()

    const nombreArchivo = [
      "Inventario",
      numeroContrato || id.slice(0, 8),
      propiedadObj?.direccion?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30),
    ].filter(Boolean).join("_") + ".pdf"

    return new NextResponse(pdfFinal, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[inventario-pdf GET]", err)
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 })
  }
}
