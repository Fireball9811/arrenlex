/** Solo el canon de arriendo exige período (fechas de inicio/fin). */

export type FechasPeriodoOk = {
  ok: true
  fecha_inicio_periodo: string | null
  fecha_fin_periodo: string | null
}

export type FechasPeriodoErr = { ok: false; error: string }

function soloFecha(s: unknown): string {
  if (s == null || typeof s !== "string") return ""
  const t = s.trim()
  if (!t) return ""
  return t.split("T")[0] ?? ""
}

export function fechasPeriodoRecibo(
  tipoPago: string | null | undefined,
  fechaInicio: unknown,
  fechaFin: unknown
): FechasPeriodoOk | FechasPeriodoErr {
  const tipo = (tipoPago || "arriendo").toLowerCase()
  const inStr = soloFecha(fechaInicio)
  const finStr = soloFecha(fechaFin)

  if (tipo === "arriendo") {
    if (!inStr || !finStr) {
      return {
        ok: false,
        error: "Para tipo Arriendo debes indicar la fecha de inicio y la fecha de fin del período cancelado.",
      }
    }
    return { ok: true, fecha_inicio_periodo: inStr, fecha_fin_periodo: finStr }
  }

  return {
    ok: true,
    fecha_inicio_periodo: inStr || null,
    fecha_fin_periodo: finStr || null,
  }
}
