/**
 * Fechas “solo día” (YYYY-MM-DD) desde Postgres/formularios no deben parsearse con
 * `new Date("2024-04-30")` + `toLocaleDateString`, porque ISO sin hora es UTC y en
 * zonas como Colombia el día mostrado puede correrse ±1.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/

function parseYmdParts(value: string): { y: number; m: number; d: number } | null {
  const part = value.trim().split("T")[0] ?? ""
  const m = YMD.exec(part)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

/** dd/mm/aaaa a partir del calendario del string (sin desfase por zona). */
export function formatCalendarDateEs(
  value: string | null | undefined,
  emptyDisplay = "—"
): string {
  if (value == null || String(value).trim() === "") return emptyDisplay
  const p = parseYmdParts(String(value))
  if (!p) return emptyDisplay
  const dd = String(p.d).padStart(2, "0")
  const mm = String(p.m).padStart(2, "0")
  return `${dd}/${mm}/${p.y}`
}

/** Hoy en la zona local del navegador/servidor como YYYY-MM-DD. */
export function todayLocalISODate(): string {
  const dt = new Date()
  const y = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, "0")
  const d = String(dt.getDate()).padStart(2, "0")
  return `${y}-${mo}-${d}`
}

/** Suma días al calendario YYYY-MM-DD (hora local, sin pasar por UTC del ISO). */
export function addCalendarDays(dateStr: string, days: number): string {
  const p = parseYmdParts(String(dateStr))
  if (!p) return String(dateStr).split("T")[0] ?? ""
  const dt = new Date(p.y, p.m - 1, p.d)
  dt.setDate(dt.getDate() + days)
  const y = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, "0")
  const d = String(dt.getDate()).padStart(2, "0")
  return `${y}-${mo}-${d}`
}

/** Clave yyyy-mm para agrupar por mes (misma lógica calendario). */
export function calendarMonthKey(value: string | null | undefined): string {
  if (!value) return ""
  const p = parseYmdParts(String(value))
  if (!p) {
    const t = new Date(String(value))
    return isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`
  }
  return `${p.y}-${String(p.m).padStart(2, "0")}`
}

export function calendarYearKey(value: string | null | undefined): string {
  if (!value) return ""
  const p = parseYmdParts(String(value))
  if (!p) {
    const t = new Date(String(value))
    return isNaN(t.getTime()) ? "" : String(t.getFullYear())
  }
  return String(p.y)
}

/** Último día del mes (anio, mes 1–12) como YYYY-MM-DD en calendario local. */
export function lastDayOfMonthLocal(anio: number, mes: number): string {
  const ultimo = new Date(anio, mes, 0)
  const y = ultimo.getFullYear()
  const mo = String(ultimo.getMonth() + 1).padStart(2, "0")
  const d = String(ultimo.getDate()).padStart(2, "0")
  return `${y}-${mo}-${d}`
}
