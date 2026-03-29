export type IndicatorLevel = "red" | "yellow" | "green"

export interface IndicatorClassification {
  level: IndicatorLevel
  backgroundColor: string
  textColor: string
}

const COLORS = {
  red: { backgroundColor: "#FEE2E2", textColor: "#B91C1C" },
  yellow: { backgroundColor: "#FEF9C3", textColor: "#92400E" },
  green: { backgroundColor: "#DCFCE7", textColor: "#166534" }
}

/**
 * Clasifica el CAP (Cap Rate) según su valor
 * - < 5% → Rojo (riesgoso)
 * - 5% - 7% → Amarillo (moderado)
 * - > 7% → Verde (saludable)
 */
export function classifyCAP(cap: number | null): IndicatorClassification | null {
  if (cap === null) return null
  if (cap < 5) return { level: "red", ...COLORS.red }
  if (cap <= 7) return { level: "yellow", ...COLORS.yellow }
  return { level: "green", ...COLORS.green }
}

/**
 * Clasifica el GRM (Gross Rent Multiplier) según su valor
 * - > 18 → Rojo (peor, toma muchos años recuperar)
 * - 14 - 18 → Amarillo (moderado)
 * - < 14 → Verde (mejor, recupera rápido)
 */
export function classifyGRM(grm: number | null): IndicatorClassification | null {
  if (grm === null) return null
  if (grm > 18) return { level: "red", ...COLORS.red }
  if (grm >= 14) return { level: "yellow", ...COLORS.yellow }
  return { level: "green", ...COLORS.green }
}

/**
 * Clasifica el Cash on Cash según su valor
 * - < 5% → Rojo (bajo retorno)
 * - 5% - 8% → Amarillo (retorno moderado)
 * - > 8% → Verde (alto retorno)
 */
export function classifyCashOnCash(coc: number | null): IndicatorClassification | null {
  if (coc === null) return null
  if (coc < 5) return { level: "red", ...COLORS.red }
  if (coc <= 8) return { level: "yellow", ...COLORS.yellow }
  return { level: "green", ...COLORS.green }
}

/**
 * Clasifica el BER (Break-Even Rent) comparando el arriendo actual con el mínimo
 * - Rent < BER → Rojo (flujo negativo)
 * - Rent == BER → Amarillo (punto de equilibrio)
 * - Rent > BER → Verde (flujo positivo)
 */
export function classifyBER(rent: number | null, ber: number | null): IndicatorClassification | null {
  if (rent === null || ber === null) return null
  if (rent < ber) return { level: "red", ...COLORS.red }
  if (rent === ber) return { level: "yellow", ...COLORS.yellow }
  return { level: "green", ...COLORS.green }
}
