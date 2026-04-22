import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import jsPDF from "jspdf"
import fs from "fs"
import path from "path"

const LOGO_PATH = path.join(process.cwd(), "public", "Logo.png")

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0)

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
  } catch {
    return String(d)
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const role = await getUserRole(supabase, user)
  if (!role || (role !== "admin" && role !== "propietario")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: contrato } = await admin
    .from("contratos")
    .select(`
      *,
      propiedad:propiedades (direccion, ciudad, barrio, matricula_inmobiliaria),
      arrendatario:arrendatarios (nombre, cedula, email, celular)
    `)
    .eq("id", contratoId)
    .single()

  if (!contrato) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })

  if (role === "propietario" && contrato.user_id !== user.id) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const { data: propietario } = await admin
    .from("perfiles")
    .select("nombre, email, cedula")
    .eq("id", contrato.user_id)
    .single()

  const { data: terminacion } = await admin
    .from("terminaciones_contrato")
    .select("*")
    .eq("contrato_id", contratoId)
    .maybeSingle()

  if (!terminacion) {
    return NextResponse.json(
      { error: "No hay datos de terminación para este contrato" },
      { status: 404 }
    )
  }

  const { data: registros = [] } = await admin
    .from("terminacion_registros")
    .select("*")
    .eq("terminacion_id", terminacion.id)
    .order("orden", { ascending: true })

  const regs = registros ?? []

  // Totales
  const totalServicios =
    Number(terminacion.valor_agua || 0) +
    Number(terminacion.valor_gas || 0) +
    Number(terminacion.valor_energia || 0)
  const totalRegistros = regs.reduce((acc, r) => acc + Number(r.valor || 0), 0)
  const deudaTotal = totalServicios + totalRegistros
  const saldo = Number(terminacion.deposito || 0) - deudaTotal

  // Logo
  let logoBase64 = ""
  try {
    if (fs.existsSync(LOGO_PATH)) {
      logoBase64 = fs.readFileSync(LOGO_PATH).toString("base64")
    }
  } catch {}

  const doc = new jsPDF({ unit: "mm", format: "letter" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  let y = margin

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, 10, 28, 28)
    } catch {}
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  const titulo = "ACTA DE TERMINACIÓN DE CONTRATO"
  doc.text(titulo, pageWidth / 2, 22, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`Contrato: ${contrato.id}`, pageWidth / 2, 29, { align: "center" })

  y = 48

  const etiqueta = (label: string, value: string) => {
    doc.setFont("helvetica", "bold")
    doc.text(label, margin, y)
    doc.setFont("helvetica", "normal")
    const lbW = doc.getTextWidth(label) + 2
    doc.text(value || "—", margin + lbW, y)
    y += 6
  }

  const seccion = (titulo: string) => {
    y += 2
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, y - 4, pageWidth - margin * 2, 6, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text(titulo, margin + 2, y)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    y += 6
  }

  const checkBreak = (extra = 0) => {
    if (y + extra > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  // Partes
  seccion("PARTES")
  etiqueta("Arrendador:", `${propietario?.nombre || "—"} · ${propietario?.email || ""}`)
  etiqueta(
    "Arrendatario:",
    `${contrato.arrendatario?.nombre || "—"} · CC ${contrato.arrendatario?.cedula || ""}`
  )

  // Inmueble
  seccion("INMUEBLE")
  etiqueta("Dirección:", `${contrato.propiedad?.direccion || ""}, ${contrato.propiedad?.ciudad || ""}`)
  if (contrato.propiedad?.barrio) etiqueta("Barrio:", contrato.propiedad.barrio)
  if (contrato.propiedad?.matricula_inmobiliaria)
    etiqueta("Matrícula:", contrato.propiedad.matricula_inmobiliaria)

  // Fechas
  seccion("FECHAS DEL CONTRATO")
  etiqueta("Fecha inicio:", fmtDate(contrato.fecha_inicio))
  etiqueta("Fecha fin:", fmtDate(contrato.fecha_fin))
  etiqueta("Fecha entrega inmueble:", fmtDate(terminacion.fecha_entrega))

  // Depósito
  seccion("DEPÓSITO")
  etiqueta("Valor del depósito:", fmtMoney(Number(terminacion.deposito || 0)))

  // Servicios
  seccion("LECTURAS DE MEDIDORES Y VALORES DE SERVICIOS")
  const filaServicio = (nombre: string, lectura: string | null, valor: number) => {
    checkBreak(8)
    doc.setFont("helvetica", "bold")
    doc.text(nombre, margin, y)
    doc.setFont("helvetica", "normal")
    doc.text(`Lectura: ${lectura || "—"}`, margin + 40, y)
    doc.text(fmtMoney(valor), pageWidth - margin, y, { align: "right" })
    y += 6
  }
  filaServicio("Agua", terminacion.lectura_agua, Number(terminacion.valor_agua || 0))
  filaServicio("Gas", terminacion.lectura_gas, Number(terminacion.valor_gas || 0))
  filaServicio("Energía", terminacion.lectura_energia, Number(terminacion.valor_energia || 0))
  y += 1
  doc.setDrawColor(180)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5
  doc.setFont("helvetica", "bold")
  doc.text("Total servicios:", margin, y)
  doc.text(fmtMoney(totalServicios), pageWidth - margin, y, { align: "right" })
  doc.setFont("helvetica", "normal")
  y += 6

  // Registros
  seccion("REGISTROS DE DAÑOS Y ANOTACIONES")
  if (regs.length === 0) {
    doc.text("Sin registros.", margin, y)
    y += 6
  } else {
    for (const r of regs) {
      checkBreak(10)
      doc.setFont("helvetica", "bold")
      const val = fmtMoney(Number(r.valor || 0))
      doc.text(val, pageWidth - margin, y, { align: "right" })
      doc.setFont("helvetica", "normal")
      const desc = doc.splitTextToSize(
        r.descripcion || "—",
        pageWidth - margin * 2 - doc.getTextWidth(val) - 6
      )
      doc.text(desc, margin, y)
      y += Math.max(6, desc.length * 5)
    }
    y += 1
    doc.setDrawColor(180)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
    doc.setFont("helvetica", "bold")
    doc.text("Total registros:", margin, y)
    doc.text(fmtMoney(totalRegistros), pageWidth - margin, y, { align: "right" })
    doc.setFont("helvetica", "normal")
    y += 6
  }

  // Notas
  if (terminacion.notas) {
    seccion("NOTAS DEL PROPIETARIO")
    const notasWrap = doc.splitTextToSize(String(terminacion.notas), pageWidth - margin * 2)
    doc.text(notasWrap, margin, y)
    y += notasWrap.length * 5 + 2
  }

  // Resumen financiero
  checkBreak(30)
  seccion("LIQUIDACIÓN FINAL")
  const fila = (label: string, val: number, bold = false) => {
    if (bold) doc.setFont("helvetica", "bold")
    doc.text(label, margin, y)
    doc.text(fmtMoney(val), pageWidth - margin, y, { align: "right" })
    if (bold) doc.setFont("helvetica", "normal")
    y += 6
  }
  fila("Depósito entregado", Number(terminacion.deposito || 0))
  fila("(-) Total servicios", totalServicios)
  fila("(-) Total registros/daños", totalRegistros)
  fila("(=) Deuda total", deudaTotal)
  y += 2
  doc.setDrawColor(100)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  if (saldo > 0) {
    doc.setTextColor(0, 128, 0)
    doc.text(
      `Saldo a favor del ARRENDATARIO: ${fmtMoney(saldo)}`,
      pageWidth / 2,
      y,
      { align: "center" }
    )
  } else if (saldo < 0) {
    doc.setTextColor(180, 0, 0)
    doc.text(
      `El ARRENDATARIO debe al ARRENDADOR: ${fmtMoney(Math.abs(saldo))}`,
      pageWidth / 2,
      y,
      { align: "center" }
    )
  } else {
    doc.text("Sin saldo pendiente para ninguna de las partes.", pageWidth / 2, y, {
      align: "center",
    })
  }
  doc.setTextColor(0)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  y += 14

  checkBreak(30)
  doc.text(
    `Generado el ${new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}`,
    margin,
    y
  )
  y += 20
  doc.line(margin, y, margin + 70, y)
  doc.line(pageWidth - margin - 70, y, pageWidth - margin, y)
  y += 5
  doc.text("Arrendador", margin + 20, y)
  doc.text("Arrendatario", pageWidth - margin - 50, y)

  const bytes = doc.output("arraybuffer")
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="acta-terminacion-${contratoId}.pdf"`,
    },
  })
}
