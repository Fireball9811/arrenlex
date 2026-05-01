import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { fetchOtrosGastoCompleto } from "@/lib/otros-gastos/fetch-completo"
import { buildOtrosGastoReciboHtml } from "@/lib/otros-gastos/recibo-html"

function unwrapPropiedad<T extends Record<string, unknown>>(row: T | T[] | null | undefined): T | null {
  if (row == null) return null
  return Array.isArray(row) ? row[0] ?? null : row
}

export async function GET(
  _request: Request,
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

  let query = admin.from("otros_gastos").select("id, user_id").eq("id", id)
  if (role === "propietario") {
    query = query.eq("user_id", user.id)
  }
  const { data: rowOk, error: rowErr } = await query.single()
  if (rowErr || !rowOk) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  const completo = await fetchOtrosGastoCompleto(admin, id)
  if (!completo) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
  }

  const propiedad = unwrapPropiedad(completo.propiedades as Record<string, unknown> | Record<string, unknown>[] | null)
  const htmlContent = buildOtrosGastoReciboHtml(
    {
      numero_recibo: completo.numero_recibo,
      fecha_emision: completo.fecha_emision,
      nombre_completo: completo.nombre_completo,
      cedula: completo.cedula,
      tarjeta_profesional: completo.tarjeta_profesional,
      correo_electronico: completo.correo_electronico,
      motivo_pago: completo.motivo_pago,
      descripcion_trabajo: completo.descripcion_trabajo,
      fecha_realizacion: completo.fecha_realizacion,
      valor: Number(completo.valor),
      banco: completo.banco,
      referencia_pago: completo.referencia_pago,
      estado: completo.estado,
    },
    propiedad,
    completo.propietario,
    completo.propiedad_id
  )

  const safeName = String(completo.numero_recibo || id).replace(/[^\w.-]+/g, "_")

  return new NextResponse(htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="Recibo_OG_${safeName}.pdf"`,
    },
  })
}
