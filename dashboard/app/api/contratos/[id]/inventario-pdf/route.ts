import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import path from "path"
import fs from "fs"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

const INVENTARIO_XLSX = path.join(process.cwd(), "public", "inventario.xlsx")
const INVENTARIO_BASE = path.join(process.cwd(), "public", "inventario-base.pdf")
const LOGO_PATH = path.join(process.cwd(), "public", "Logo.png")

const BLUE: [number, number, number] = [23, 56, 112]

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

function cellToString(c: unknown): string {
  if (c == null) return ""
  if (c instanceof Date) return c.toLocaleDateString("es-CO")
  return String(c)
}

/** Filas no vacías y celdas alineadas al ancho máximo de la hoja */
function normalizeSheetRows(raw: unknown[][]): string[][] {
  const rows = raw.filter((row) =>
    (row as unknown[]).some((cell) => cell !== "" && cell != null && String(cell).trim() !== "")
  )
  if (rows.length === 0) return []
  const maxCols = Math.max(...rows.map((r) => (r as unknown[]).length))
  return rows.map((row) => {
    const arr = [...(row as unknown[])]
    while (arr.length < maxCols) arr.push("")
    return arr.map(cellToString)
  })
}

function loadLogoBase64(): string {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      return fs.readFileSync(LOGO_PATH).toString("base64")
    }
  } catch (e) {
    console.warn("[inventario-pdf] No se pudo cargar logo:", e)
  }
  return ""
}

/** PDF generado desde la primera hoja de inventario.xlsx (logo + datos del contrato + tabla + firmas) */
function buildPdfFromXlsx(
  xlsxPath: string,
  meta: {
    numeroContrato: string
    direccion: string
    fechaInicio: string
    propietarioNombre: string
    arrendatarioNombre: string
  }
): Buffer {
  const buf = fs.readFileSync(xlsxPath)
  const workbook = XLSX.read(buf, { type: "buffer", cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][]
  const normalized = normalizeSheetRows(raw)

  const doc = new jsPDF({ unit: "mm", format: "letter" })
  const pageH = doc.internal.pageSize.getHeight()
  const pageW = doc.internal.pageSize.getWidth()
  const logoB64 = loadLogoBase64()

  if (logoB64) {
    try {
      doc.addImage(logoB64, "PNG", 14, 10, 35, 16)
    } catch (e) {
      console.warn("[inventario-pdf] addImage logo:", e)
    }
  }

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BLUE)
  doc.setFontSize(11)
  doc.text("Inventario del inmueble", 14, 34)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  let metaY = 39
  if (meta.numeroContrato) {
    doc.setFont("helvetica", "bold")
    doc.text(`Contrato: ${meta.numeroContrato}`, 14, metaY)
    metaY += 5
  }
  doc.setFont("helvetica", "normal")
  if (meta.direccion) {
    const lines = doc.splitTextToSize(`Propiedad: ${meta.direccion}`, pageW - 28)
    doc.text(lines, 14, metaY)
    metaY += lines.length * 4.2
  }
  if (meta.fechaInicio) {
    doc.text(`Fecha inicio: ${meta.fechaInicio}`, 14, metaY)
    metaY += 5
  }

  const startY = metaY + 4

  if (normalized.length === 0) {
    doc.setFontSize(9)
    doc.text("(La primera hoja del Excel no tiene filas con datos.)", 14, startY)
  } else {
    const head = [normalized[0]]
    const body = normalized.slice(1)
    autoTable(doc, {
      head: body.length > 0 ? head : undefined,
      body: body.length > 0 ? body : normalized,
      startY,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak", textColor: [40, 40, 40] },
      headStyles: { fillColor: BLUE, textColor: 255 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1 && logoB64) {
          try {
            doc.addImage(logoB64, "PNG", 14, 6, 22, 10)
          } catch {
            /* ignore */
          }
        }
      },
    })
  }

  type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } }
  const finalY = (doc as DocWithTable).lastAutoTable?.finalY ?? startY + 10
  let sigY = finalY + 14
  if (sigY + 42 > pageH) {
    doc.addPage()
    sigY = 40
  }

  const colIzq = 22
  const colDer = pageW / 2 + 8
  const lineW = 72
  const firmaY = sigY

  doc.setDrawColor(...BLUE)
  doc.setLineWidth(0.3)
  doc.line(colIzq, firmaY, colIzq + lineW, firmaY)
  doc.line(colDer, firmaY, colDer + lineW, firmaY)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.setTextColor(...BLUE)
  doc.text("PROPIETARIO", colIzq, firmaY + 6)
  doc.text("ARRENDATARIO", colDer, firmaY + 6)
  doc.setFontSize(8)
  if (meta.propietarioNombre) {
    doc.text(meta.propietarioNombre, colIzq, firmaY - 4)
  }
  if (meta.arrendatarioNombre) {
    doc.text(meta.arrendatarioNombre, colDer, firmaY - 4)
  }

  return Buffer.from(doc.output("arraybuffer"))
}

async function buildPdfFromBaseOverlay(
  meta: {
    numeroContrato: string
    direccion: string
    fechaInicio: string
    propietarioNombre: string
    arrendatarioNombre: string
  }
): Promise<Buffer> {
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

    if (i === 0) {
      const infoX = LOGO_W + 30
      const infoY = height - 18

      if (meta.numeroContrato) {
        page.drawText(`Contrato: ${meta.numeroContrato}`, {
          x: infoX,
          y: infoY,
          size: 8,
          font: boldFont,
          color: DARK_BLUE,
        })
      }

      if (meta.direccion) {
        page.drawText(`Propiedad: ${meta.direccion}`, {
          x: infoX,
          y: infoY - 12,
          size: 7.5,
          font: regularFont,
          color: GRAY,
        })
      }

      if (meta.fechaInicio) {
        page.drawText(`Fecha inicio: ${meta.fechaInicio}`, {
          x: infoX,
          y: infoY - 23,
          size: 7.5,
          font: regularFont,
          color: GRAY,
        })
      }
    }

    if (i === pages.length - 1) {
      const firmaY = 72
      const colIzq = 60
      const colDer = width / 2 + 40
      const lineW = 160

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
      if (meta.propietarioNombre) {
        page.drawText(meta.propietarioNombre, {
          x: colIzq,
          y: firmaY - 10,
          size: 7.5,
          font: boldFont,
          color: DARK_BLUE,
        })
      }

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
      if (meta.arrendatarioNombre) {
        page.drawText(meta.arrendatarioNombre, {
          x: colDer,
          y: firmaY - 10,
          size: 7.5,
          font: boldFont,
          color: DARK_BLUE,
        })
      }
    }
  }

  return Buffer.from(await pdfDoc.save())
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

  const { data: perfil } = await admin
    .from("perfiles")
    .select("nombre")
    .eq("id", contrato.user_id)
    .single()

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

  const meta = {
    numeroContrato,
    direccion,
    fechaInicio,
    propietarioNombre,
    arrendatarioNombre,
  }

  const tieneXlsx = fs.existsSync(INVENTARIO_XLSX)
  const tienePdfBase = fs.existsSync(INVENTARIO_BASE)

  if (!tieneXlsx && !tienePdfBase) {
    return NextResponse.json(
      {
        error:
          "No hay plantilla de inventario. Coloca inventario.xlsx o inventario-base.pdf en la carpeta public/ del proyecto.",
      },
      { status: 404 }
    )
  }

  const nombreArchivo =
    ["Inventario", numeroContrato || id.slice(0, 8), propiedadObj?.direccion?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)]
      .filter(Boolean)
      .join("_") + ".pdf"

  try {
    const pdfFinal = tieneXlsx
      ? buildPdfFromXlsx(INVENTARIO_XLSX, meta)
      : await buildPdfFromBaseOverlay(meta)

    return new NextResponse(new Uint8Array(pdfFinal), {
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
