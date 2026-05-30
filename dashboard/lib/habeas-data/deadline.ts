import type { TipoSolicitudHabeas } from "./constants"

/**
 * Suma días hábiles lunes–viernes a partir de una fecha (sin festivos colombianos).
 * TODO: Replace calendar day calculation with Colombian business day calculation.
 * (Actualmente solo se excluyen sábados y domingos en UTC.)
 */
export function addWeekdayBusinessDays(from: Date, businessDays: number): Date {
  const d = new Date(from.getTime())
  let remaining = businessDays
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) remaining -= 1
  }
  return d
}

export function suggestedDeadlineForTipo(
  fechaRecibido: Date,
  tipoSolicitud: TipoSolicitudHabeas
): Date {
  const days = tipoSolicitud === "consulta" ? 10 : 15
  return addWeekdayBusinessDays(fechaRecibido, days)
}
