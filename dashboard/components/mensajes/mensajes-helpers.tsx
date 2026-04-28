"use client"

import { useState, type ReactNode } from "react"
import type { IntakeFormulario } from "@/lib/types/database"
import type { UserRole } from "@/lib/auth/role"
import { useLang } from "@/lib/i18n/context"

// ── Tipos del scoring ──────────────────────────────────────────────────────

type FiltroExcluyente = { aplica: true; motivo: string }

type ScoreFlags = {
  empresaPrincipalIndependiente: boolean
  empresaSecundariaIndependiente: boolean
  camposVacios: Set<string>
  hayCoarrendatario: boolean
  ninosEnHogar: boolean
  negocioEnPropiedad: boolean
  tieneRechazoPrevio: boolean
  rechazosPrevios: Array<{
    id: string
    motivo_descarte: string | null
    descartado_at: string | null
    propiedad_id: string | null
  }>
  totalSinPenalizarReincidencia: number
  // Política de arriendo según dependientes
  incumplePoliticaArriendo: boolean
  porcentajeMax: number
  porcentajeReal: number
  ingresoMinimoRecomendado: number
  dependientes: number
}

type ScoreDetalle = {
  capacidadPago: { puntos: number; descripcion: string }
  estabilidadLaboral: { puntos: number; descripcion: string }
  composicionHogar: { puntos: number; descripcion: string }
  mascotas: { puntos: number; descripcion: string }
  otrosAspectos: { puntos: number; descripcion: string }
  flags: ScoreFlags
  total: number
  etiqueta: string
  nivel: "verde" | "amarillo" | "rojo"
}

export type ResultadoScore =
  | { excluido: true; filtro: FiltroExcluyente; sinCanon?: false }
  | { excluido: false; sinCanon: true }
  | { excluido: false; sinCanon: false; score: ScoreDetalle }

// ── Helpers ────────────────────────────────────────────────────────────────

function esIndependiente(v: string | null | undefined): boolean {
  if (!v) return false
  const s = v.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
  return s.includes("independiente")
}

function esVacio(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === "string") return v.trim() === "" || v.trim() === "—"
  return false
}

// Formatea una fecha ISO/texto como "DD/MM/AAAA".
// Si viene solo "YYYY-MM-DD" (DATE) la reordena sin pasar por Date() para evitar
// desplazamientos de zona horaria.
function formatearFechaDMY(raw: string | null | undefined): string {
  if (!raw) return "—"
  const s = raw.trim()
  if (!s || s === "—") return "—"
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
  const asDate = new Date(s)
  if (!isNaN(asDate.getTime())) {
    const d = String(asDate.getDate()).padStart(2, "0")
    const m = String(asDate.getMonth() + 1).padStart(2, "0")
    const y = asDate.getFullYear()
    return `${d}/${m}/${y}`
  }
  return s
}

// Cuenta días hábiles (lunes a viernes) desde `desde` hasta `hasta`, sin incluir `desde`
// e incluyendo `hasta` si es hábil. Devuelve null si alguno de los valores es inválido.
export function diasHabilesEntre(
  desde: string | Date | null | undefined,
  hasta: string | Date | null | undefined
): number | null {
  if (!desde || !hasta) return null
  const d0 = typeof desde === "string" ? new Date(desde) : desde
  const d1Raw = typeof hasta === "string" ? new Date(hasta) : hasta
  if (isNaN(d0.getTime()) || isNaN(d1Raw.getTime())) return null
  // Normalizar a inicio de día para evitar que el componente horario meta ruido.
  const a = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
  const b = new Date(d1Raw.getFullYear(), d1Raw.getMonth(), d1Raw.getDate())
  if (b <= a) return 0
  let dias = 0
  const cursor = new Date(a)
  while (cursor < b) {
    cursor.setDate(cursor.getDate() + 1)
    const dow = cursor.getDay() // 0=Dom, 6=Sáb
    if (dow !== 0 && dow !== 6) dias += 1
  }
  return dias
}

// ── Función pura de scoring ────────────────────────────────────────────────

export function calcularScore(r: IntakeFormulario): ResultadoScore {
  const canon = r.valor_arriendo
  if (canon == null) return { excluido: false, sinCanon: true }

  const salarioPrincipal = r.salario_principal ?? r.salario ?? 0
  const salarioSecundario = r.salario_secundario ?? r.salario_2 ?? 0
  const ingresoTotal = salarioPrincipal + salarioSecundario

  const fmt = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v)

  const autorizacion = (r.autorizacion ?? "").toLowerCase()
  if (!autorizacion || (!autorizacion.includes("sí") && !autorizacion.includes("si"))) {
    return { excluido: true, filtro: { aplica: true, motivo: "No autorizó tratamiento de datos personales" } }
  }

  if (canon > 0 && ingresoTotal < canon * 1.2) {
    return {
      excluido: true,
      filtro: { aplica: true, motivo: `Ingresos insuficientes: ${fmt(ingresoTotal)} < 1.2x canon (${fmt(canon * 1.2)}). Se requiere mínimo ${fmt(canon * 1.2)}.` },
    }
  }

  // Política de arriendo según dependientes:
  // dependientes = niños del hogar + adultos que no trabajan.
  // El % máximo del ingreso destinado al arriendo baja a más dependientes.
  const adultosBase = r.adultos_habitantes ?? r.personas ?? 1
  const ninosBase = r.ninos_habitantes ?? r.ninos ?? 0
  const personasTrabajan = r.personas_trabajan ?? 1
  const adultosNoTrabajan = Math.max(0, adultosBase - personasTrabajan)
  const dependientes = adultosNoTrabajan + ninosBase

  const porcentajeMax =
    dependientes <= 0 ? 0.30 :
    dependientes === 1 ? 0.28 :
    dependientes === 2 ? 0.25 : 0.22

  const ingresoMinimoRecomendado = canon > 0 ? canon / porcentajeMax : 0
  const porcentajeReal = ingresoTotal > 0 && canon > 0 ? canon / ingresoTotal : 1
  const ratioPolitica = ingresoMinimoRecomendado > 0 ? ingresoTotal / ingresoMinimoRecomendado : 0
  const incumplePoliticaArriendo = canon > 0 && ingresoTotal < ingresoMinimoRecomendado

  const pctRealStr = `${(porcentajeReal * 100).toFixed(1)}%`
  const pctMaxStr = `${Math.round(porcentajeMax * 100)}%`
  const depStr = `${dependientes} ${dependientes === 1 ? "dependiente" : "dependientes"}`
  const baseDesc = `Arriendo = ${pctRealStr} del ingreso (máx ${pctMaxStr}, ${depStr}). Mín. recomendado: ${fmt(ingresoMinimoRecomendado)}`

  let ptsPago = 0; let descPago = ""
  if (ratioPolitica >= 1.5) { ptsPago = 50; descPago = `Excelente — holgado vs. política. ${baseDesc}` }
  else if (ratioPolitica >= 1.2) { ptsPago = 42; descPago = `Muy bueno. ${baseDesc}` }
  else if (ratioPolitica >= 1.0) { ptsPago = 35; descPago = `Cumple política recomendada. ${baseDesc}` }
  else if (ratioPolitica >= 0.85) { ptsPago = 20; descPago = `Incumple política — leve. ${baseDesc}` }
  else if (ratioPolitica >= 0.7) { ptsPago = 10; descPago = `Incumple política — moderado. ${baseDesc}` }
  else { ptsPago = 3; descPago = `Incumple política — alto riesgo. ${baseDesc}` }

  const meses = r.tiempo_servicio_principal_meses ?? r.antiguedad_meses ?? 0
  let ptsLaboral = 0; let descLaboral = ""
  if (meses >= 24) { ptsLaboral = 20; descLaboral = `${meses} meses — Muy estable` }
  else if (meses >= 12) { ptsLaboral = 13; descLaboral = `${meses} meses — Estable` }
  else if (meses >= 6) { ptsLaboral = 8; descLaboral = `${meses} meses — Moderado` }
  else { ptsLaboral = 4; descLaboral = `${meses} meses — Bajo` }

  const adultos = r.adultos_habitantes ?? r.personas ?? 1
  const ninos = r.ninos_habitantes ?? r.ninos ?? 0
  const ninosEnHogar = ninos > 0
  const ocupantes = adultos + ninos
  let ptsHogar = 0; let descHogar = ""
  if (ocupantes <= 2) { ptsHogar = 15; descHogar = `${ocupantes} personas — Ideal` }
  else if (ocupantes === 3) { ptsHogar = 12; descHogar = `${ocupantes} personas — Adecuado` }
  else if (ocupantes === 4) { ptsHogar = 9; descHogar = `${ocupantes} personas — A evaluar` }
  else if (ocupantes === 5) { ptsHogar = 6; descHogar = `${ocupantes} personas — A evaluar` }
  else { ptsHogar = 3; descHogar = `${ocupantes} personas — Riesgo` }

  const mascotas = r.mascotas_cantidad ?? r.mascotas ?? 0
  let ptsMascotas = 0; let descMascotas = ""
  if (mascotas === 0) { ptsMascotas = 5; descMascotas = "Sin mascotas — Ideal" }
  else if (mascotas === 1) { ptsMascotas = 3; descMascotas = "1 mascota — A evaluar" }
  else { ptsMascotas = 1; descMascotas = `${mascotas} mascotas — Riesgo` }

  // ── Penalizaciones ──

  const hayCoarrendatario = !!(
    r.coarrendatario_nombre || r.nombre_coarrendatario ||
    r.coarrendatario_cedula || r.cedula_coarrendatario
  )

  const camposPrincipal: { key: string; valor: unknown }[] = [
    { key: "email", valor: r.email },
    { key: "telefono", valor: r.telefono },
    { key: "cedula", valor: r.cedula },
    { key: "cedula_ciudad_expedicion", valor: r.cedula_ciudad_expedicion ?? r.fecha_expedicion_cedula },
    { key: "salario_principal", valor: r.salario_principal ?? r.salario },
    { key: "empresa_principal", valor: r.empresa_principal ?? r.empresa_arrendatario },
    { key: "tiempo_servicio_principal_meses", valor: r.tiempo_servicio_principal_meses ?? r.antiguedad_meses },
    { key: "personas_trabajan", valor: r.personas_trabajan },
    { key: "adultos_habitantes", valor: r.adultos_habitantes ?? r.personas },
    { key: "ninos_habitantes", valor: r.ninos_habitantes ?? r.ninos },
    { key: "mascotas_cantidad", valor: r.mascotas_cantidad ?? r.mascotas },
  ]
  const camposCoarrendatario: { key: string; valor: unknown }[] = hayCoarrendatario
    ? [
        { key: "coarrendatario_email", valor: r.coarrendatario_email },
        { key: "coarrendatario_telefono", valor: r.coarrendatario_telefono ?? r.telefono_coarrendatario },
        { key: "empresa_secundaria", valor: r.empresa_secundaria ?? r.empresa_coarrendatario },
        { key: "tiempo_servicio_secundario_meses", valor: r.tiempo_servicio_secundario_meses ?? r.antiguedad_meses_2 },
        { key: "salario_secundario", valor: r.salario_secundario ?? r.salario_2 },
      ]
    : []

  const camposVacios = new Set<string>()
  let descuentoOtros = 0
  camposPrincipal.forEach(({ key, valor }) => {
    if (esVacio(valor)) { camposVacios.add(key); descuentoOtros += 2 }
  })
  camposCoarrendatario.forEach(({ key, valor }) => {
    if (esVacio(valor)) { camposVacios.add(key); descuentoOtros += 1 }
  })

  const desbalanceLaboral = hayCoarrendatario && r.personas_trabajan === 1
  if (desbalanceLaboral) {
    ptsLaboral = Math.max(0, ptsLaboral - 8)
  }

  const empresaPrincipalIndependiente = esIndependiente(r.empresa_principal ?? r.empresa_arrendatario)
  const empresaSecundariaIndependiente = esIndependiente(r.empresa_secundaria ?? r.empresa_coarrendatario)
  if (empresaPrincipalIndependiente) descuentoOtros += 3
  if (empresaSecundariaIndependiente) descuentoOtros += 2

  let ptsOtros = Math.max(0, 10 - descuentoOtros)
  let descOtros = ""
  if (ptsOtros >= 9) descOtros = "Información completa"
  else if (ptsOtros >= 7) descOtros = "Información mayormente completa"
  else if (ptsOtros >= 4) descOtros = "Requiere revisión"
  else descOtros = "Información muy incompleta"

  // Negocio en propiedad — ya no excluye; aplica x0.5 al total
  const negocioEnPropiedad = !!(
    r.negocio && r.negocio.trim() !== "" && r.negocio.trim().toLowerCase() !== "no"
  )
  if (negocioEnPropiedad) {
    ptsPago = Math.round(ptsPago * 0.5)
    ptsLaboral = Math.round(ptsLaboral * 0.5)
    ptsHogar = Math.round(ptsHogar * 0.5)
    ptsMascotas = Math.round(ptsMascotas * 0.5)
    ptsOtros = Math.round(ptsOtros * 0.5)
  }

  const totalBruto = ptsPago + ptsLaboral + ptsHogar + ptsMascotas + ptsOtros

  // Reincidencia: misma cédula con un descarte previo → -30% al total final
  const rechazosPrevios = (r.rechazos_previos ?? []).filter((rp) => rp && rp.id)
  const tieneRechazoPrevio = rechazosPrevios.length > 0
  const total = tieneRechazoPrevio ? Math.round(totalBruto * 0.7) : totalBruto

  let etiqueta = ""; let nivel: "verde" | "amarillo" | "rojo" = "rojo"
  if (total >= 80) { etiqueta = "Aprobación recomendada"; nivel = "verde" }
  else if (total >= 60) { etiqueta = "Aprobación con revisión"; nivel = "amarillo" }
  else { etiqueta = "No recomendado"; nivel = "rojo" }

  return {
    excluido: false, sinCanon: false,
    score: {
      capacidadPago: { puntos: ptsPago, descripcion: descPago },
      estabilidadLaboral: { puntos: ptsLaboral, descripcion: descLaboral },
      composicionHogar: { puntos: ptsHogar, descripcion: descHogar },
      mascotas: { puntos: ptsMascotas, descripcion: descMascotas },
      otrosAspectos: { puntos: ptsOtros, descripcion: descOtros },
      flags: {
        empresaPrincipalIndependiente,
        empresaSecundariaIndependiente,
        camposVacios,
        hayCoarrendatario,
        ninosEnHogar,
        negocioEnPropiedad,
        tieneRechazoPrevio,
        rechazosPrevios,
        totalSinPenalizarReincidencia: totalBruto,
        incumplePoliticaArriendo,
        porcentajeMax,
        porcentajeReal,
        ingresoMinimoRecomendado,
        dependientes,
      },
      total, etiqueta, nivel,
    },
  }
}

// ── Componente de calificación ─────────────────────────────────────────────

export function SeccionCalificacion({ registro }: { registro: IntakeFormulario }) {
  const resultado = calcularScore(registro)
  const { t } = useLang()

  const avisoUnicoArrendatario = registro.unico_arrendatario === true ? (
    <div className="mt-6 pt-4 border-t">
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
          Motivo de estudio: único arrendatario
        </p>
        <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
          El aplicante declaró que será la única persona que vivirá en el inmueble y no
          registra coarrendatario. Evaluar capacidad de pago sin codeudor.
        </p>
      </div>
    </div>
  ) : null

  if (resultado.sinCanon) {
    return (
      <>
        {avisoUnicoArrendatario}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.mensajes.calificacion.titulo}</p>
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            {t.mensajes.calificacion.sinCanonMsg}
          </div>
        </div>
      </>
    )
  }
  if (resultado.excluido) {
    return (
      <>
        {avisoUnicoArrendatario}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.mensajes.calificacion.titulo}</p>
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
            <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">{t.mensajes.calificacion.rechazado}</p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">{resultado.filtro.motivo}</p>
          </div>
        </div>
      </>
    )
  }

  const { score } = resultado
  const colorTotal = score.nivel === "verde" ? "text-green-600 dark:text-green-400" : score.nivel === "amarillo" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
  const bgBarra = score.nivel === "verde" ? "bg-green-500" : score.nivel === "amarillo" ? "bg-amber-500" : "bg-red-500"
  const borderColor = score.nivel === "verde" ? "border-green-500/40 bg-green-500/10" : score.nivel === "amarillo" ? "border-amber-500/40 bg-amber-500/10" : "border-red-500/40 bg-red-500/10"
  const factores = [
    { label: t.mensajes.calificacion.capacidadPago, max: 50, ...score.capacidadPago },
    { label: t.mensajes.calificacion.estabilidadLaboral, max: 20, ...score.estabilidadLaboral },
    { label: t.mensajes.calificacion.composicionHogar, max: 15, ...score.composicionHogar },
    { label: t.mensajes.calificacion.mascotas, max: 5, ...score.mascotas },
    { label: t.mensajes.calificacion.otrosAspectos, max: 10, ...score.otrosAspectos },
  ]

  return (
    <>
      {avisoUnicoArrendatario}
      <div className="mt-6 pt-4 border-t">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Calificación ARRENLEX</p>
      {score.flags.tieneRechazoPrevio && (
        <div className="rounded-lg border-2 border-red-600 bg-red-100/70 dark:bg-red-950/50 px-4 py-3 mb-3">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">
            {t.mensajes.cedulaReincidente}
          </p>
          <p className="text-xs text-red-800/90 dark:text-red-200/90 mt-1">
            Puntaje original: <span className="font-semibold">{score.flags.totalSinPenalizarReincidencia}/100</span>{" "}
            → ajustado a <span className="font-semibold">{score.total}/100</span>. {t.mensajes.rechazoPrevioDetalle}
          </p>
        </div>
      )}
      {score.flags.incumplePoliticaArriendo && (() => {
        const fmtCop = (v: number) =>
          new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v)
        const ingresoTotalReal =
          (registro.salario_principal ?? registro.salario ?? 0) +
          (registro.salario_secundario ?? registro.salario_2 ?? 0)
        const dep = score.flags.dependientes
        const depLabel = `${dep} ${dep === 1 ? "dependiente" : "dependientes"}`
        return (
          <div className="rounded-lg border-2 border-amber-500 bg-amber-100/70 dark:bg-amber-950/50 px-4 py-3 mb-3">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
              Incumple política de arriendo
            </p>
            <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-1">
              Política recomendada: arriendo ≤ <span className="font-semibold">{Math.round(score.flags.porcentajeMax * 100)}%</span> del ingreso del hogar ({depLabel}).
              {" "}Hoy el arriendo equivale al{" "}
              <span className="font-semibold">{(score.flags.porcentajeReal * 100).toFixed(1)}%</span> del ingreso.
            </p>
            <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-1">
              Ingreso actual: <span className="font-semibold">{fmtCop(ingresoTotalReal)}</span>{" "}
              · Mínimo recomendado: <span className="font-semibold">{fmtCop(score.flags.ingresoMinimoRecomendado)}</span>
            </p>
          </div>
        )
      })()}
      <div className={`rounded-lg border px-4 py-3 mb-4 ${borderColor}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-lg font-bold ${colorTotal}`}>{score.etiqueta}</span>
          <span className={`text-3xl font-black ${colorTotal}`}>{score.total}<span className="text-base font-medium">/100</span></span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${bgBarra}`} style={{ width: `${score.total}%` }} />
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {factores.map((f) => (
          <div key={f.label} className="flex-1 min-w-0">
            <div className="flex justify-between mb-0.5">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium ml-2">{f.puntos}/{f.max}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${bgBarra}`} style={{ width: `${(f.puntos / f.max) * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{f.descripcion}</p>
          </div>
        ))}
      </div>
    </div>
    </>
  )
}

// ── Modal de comparación rankeada ──────────────────────────────────────────

export function ModalComparacion({
  registros,
  onCerrar,
}: {
  registros: IntakeFormulario[]
  onCerrar: () => void
}) {
  const { t } = useLang()

  type Fila = { registro: IntakeFormulario; resultado: ResultadoScore; sortKey: number }

  const filas: Fila[] = registros
    .map((r) => {
      const resultado = calcularScore(r)
      let sortKey = -1
      if (!resultado.sinCanon && !resultado.excluido) sortKey = resultado.score.total
      return { registro: r, resultado, sortKey }
    })
    .sort((a, b) => b.sortKey - a.sortKey)

  const inmueble = registros[0]?.propiedad_id ?? registros[0]?.id_inmueble ?? "—"
  const canon = registros[0]?.valor_arriendo

  const fmtCurrency = (v: number | null | undefined) =>
    v != null
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v)
      : "—"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-xl font-bold">{t.mensajes.comparacion.titulo}</h2>
            <p className="text-sm text-muted-foreground">
              {t.mensajes.comparacion.inmueble} <span className="font-medium">{inmueble}</span>
              {canon != null && <> — {t.mensajes.comparacion.canon} <span className="font-medium">{fmtCurrency(canon)}</span></>}
            </p>
          </div>
          <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground text-2xl leading-none" aria-label="Cerrar">×</button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t.mensajes.comparacion.ordenados}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium w-8">#</th>
                <th className="text-left p-2 font-medium">{t.mensajes.columnas.nombre}</th>
                <th className="text-right p-2 font-medium">{t.mensajes.calificacion.capacidadPago}<br /><span className="font-normal text-muted-foreground text-xs">/50</span></th>
                <th className="text-right p-2 font-medium">{t.mensajes.calificacion.estabilidadLaboral}<br /><span className="font-normal text-muted-foreground text-xs">/20</span></th>
                <th className="text-right p-2 font-medium">{t.mensajes.calificacion.composicionHogar}<br /><span className="font-normal text-muted-foreground text-xs">/15</span></th>
                <th className="text-right p-2 font-medium">{t.mensajes.calificacion.mascotas}<br /><span className="font-normal text-muted-foreground text-xs">/5</span></th>
                <th className="text-right p-2 font-medium">{t.mensajes.calificacion.otrosAspectos}<br /><span className="font-normal text-muted-foreground text-xs">/10</span></th>
                <th className="text-right p-2 font-medium">Total<br /><span className="font-normal text-muted-foreground text-xs">/100</span></th>
                <th className="text-left p-2 font-medium">{t.mensajes.calificacion.titulo}</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ registro: r, resultado }, idx) => {
                const esGanador = idx === 0 && !resultado.sinCanon && !resultado.excluido
                const rowClass = esGanador
                  ? "border-b border-l-4 border-l-green-500 bg-green-500/5"
                  : "border-b hover:bg-muted/20"

                if (resultado.sinCanon) {
                  return (
                    <tr key={r.id} className={rowClass}>
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-medium">{r.nombre ?? "—"}</td>
                      <td colSpan={6} className="p-2 text-center text-muted-foreground text-xs">{t.mensajes.comparacion.sinPropiedad}</td>
                      <td className="p-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t.mensajes.comparacion.sinDatos}</span></td>
                    </tr>
                  )
                }
                if (resultado.excluido) {
                  return (
                    <tr key={r.id} className={rowClass}>
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-medium">{r.nombre ?? "—"}</td>
                      <td colSpan={6} className="p-2 text-xs text-red-600 dark:text-red-400 truncate max-w-[200px]" title={resultado.filtro.motivo}>{resultado.filtro.motivo}</td>
                      <td className="p-2"><span className="rounded-full bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-0.5 text-xs font-medium">{t.mensajes.comparacion.excluido}</span></td>
                    </tr>
                  )
                }

                const { score } = resultado
                const colorScore = score.nivel === "verde" ? "text-green-600 dark:text-green-400 font-bold" : score.nivel === "amarillo" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-red-600 dark:text-red-400 font-bold"
                const badgeClass = score.nivel === "verde" ? "bg-green-500/15 text-green-700 dark:text-green-400" : score.nivel === "amarillo" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-red-500/15 text-red-700 dark:text-red-400"

                return (
                  <tr key={r.id} className={rowClass}>
                    <td className="p-2 font-bold text-muted-foreground">
                      {esGanador ? <span className="text-green-600 dark:text-green-400">1</span> : idx + 1}
                    </td>
                    <td className="p-2 font-medium">
                      {r.nombre ?? "—"}
                      {esGanador && <span className="ml-2 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 text-xs">{t.mensajes.comparacion.mejor}</span>}
                    </td>
                    <td className={`p-2 text-right ${colorScore}`}>{score.capacidadPago.puntos}</td>
                    <td className={`p-2 text-right ${colorScore}`}>{score.estabilidadLaboral.puntos}</td>
                    <td className={`p-2 text-right ${colorScore}`}>{score.composicionHogar.puntos}</td>
                    <td className={`p-2 text-right ${colorScore}`}>{score.mascotas.puntos}</td>
                    <td className={`p-2 text-right ${colorScore}`}>{score.otrosAspectos.puntos}</td>
                    <td className={`p-2 text-right text-lg ${colorScore}`}>{score.total}</td>
                    <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{score.etiqueta}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
          {t.mensajes.comparacion.modeloBase}
        </div>
      </div>
    </div>
  )
}

// ── Tabla de intake reutilizable ───────────────────────────────────────────

export function TablaIntake({
  lista,
  seleccionados,
  onToggle,
  onVerDetalle,
  formatDate,
  formatCurrency,
  puedeComparar,
  motivoInvalido,
  onComparar,
  role,
  onEliminar,
  onCompletar,
  onDescompletar,
}: {
  lista: IntakeFormulario[]
  seleccionados: Set<string>
  onToggle: (id: string) => void
  onVerDetalle: (r: IntakeFormulario) => void
  formatDate: (d: string | null | undefined) => string
  formatCurrency: (v: number | null | undefined) => string
  puedeComparar: boolean
  motivoInvalido: string
  onComparar: () => void
  role: UserRole
  onEliminar?: (id: string) => Promise<{ ok: boolean; error?: string }>
  onCompletar?: (id: string) => Promise<{ ok: boolean; error?: string }>
  onDescompletar?: (id: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const { t } = useLang()
  const [confirmando, setConfirmando] = useState<IntakeFormulario | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [procesandoCompletarId, setProcesandoCompletarId] = useState<string | null>(null)

  if (lista.length === 0) return null

  const todosSeleccionados = lista.every((r) => seleccionados.has(r.id))
  const algunoSeleccionado = lista.some((r) => seleccionados.has(r.id))

  const toggleTodos = () => {
    if (todosSeleccionados) {
      lista.forEach((r) => onToggle(r.id))
    } else {
      lista.filter((r) => !seleccionados.has(r.id)).forEach((r) => onToggle(r.id))
    }
  }

  return (
    <>
      {algunoSeleccionado && (
        <div className="flex items-center justify-between mb-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {seleccionados.size} {seleccionados.size !== 1 ? t.mensajes.seleccionadosPlural : t.mensajes.seleccionados}
          </span>
          <div className="flex items-center gap-2">
            {!puedeComparar && motivoInvalido && (
              <span className="text-xs text-red-500 dark:text-red-400">{motivoInvalido}</span>
            )}
            <button
              onClick={onComparar}
              disabled={!puedeComparar}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                puedeComparar
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              }`}
            >
              {t.mensajes.comparar}
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 w-8">
                <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos} className="rounded" title="Seleccionar todos" />
              </th>
              <th className="text-left p-2 font-medium">Nombre</th>
              <th className="text-left p-2 font-medium">Cédula</th>
              <th className="text-left p-2 font-medium">Email</th>
              <th className="text-left p-2 font-medium">{t.mensajes.columnas.celular}</th>
              <th className="text-left p-2 font-medium">{t.mensajes.columnas.celularCoarrendatario}</th>
              <th className="text-left p-2 font-medium">Ingresos</th>
              <th className="text-left p-2 font-medium">Personas</th>
              <th className="text-left p-2 font-medium">{t.mensajes.columnas.ninos}</th>
              <th className="text-left p-2 font-medium">Mascotas</th>
              <th className="text-left p-2 font-medium">Empresa</th>
              <th className="text-left p-2 font-medium">Estado</th>
              <th className="text-left p-2 font-medium">Fecha</th>
              <th className="text-left p-2 font-medium">{t.mensajes.columnas.acciones}</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => {
              const salarioPrincipal = r.salario_principal ?? r.salario ?? 0
              const salarioSecundario = r.salario_secundario ?? r.salario_2 ?? 0
              const ingresosTotales = salarioPrincipal + salarioSecundario
              const personas = r.adultos_habitantes ?? r.personas ?? 0
              const ninos = r.ninos_habitantes ?? r.ninos ?? 0
              const mascotas = r.mascotas_cantidad ?? r.mascotas ?? 0
              const empresa = r.empresa_principal ?? r.empresa_arrendatario ?? r.empresas ?? "—"
              const celularPrincipal = r.telefono ?? "—"
              const celularCoarrendatario = r.coarrendatario_telefono ?? r.telefono_coarrendatario ?? "—"

              return (
                <tr
                  key={r.id}
                  className={`border-b transition-colors ${seleccionados.has(r.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}
                >
                  <td className="p-2">
                    <input type="checkbox" checked={seleccionados.has(r.id)} onChange={() => onToggle(r.id)} className="rounded" />
                  </td>
                  <td className="p-2 font-medium">
                    {r.nombre ?? "—"}
                    {(r.rechazos_previos?.length ?? 0) > 0 && (
                      <span
                        className="ml-2 inline-block rounded bg-red-500/15 text-red-700 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        title={r.rechazos_previos!.map((rp) => rp.motivo_descarte ?? "—").join(" | ")}
                      >
                        {t.mensajes.reincidenteBadge}
                      </span>
                    )}
                  </td>
                  <td className="p-2">{r.cedula ?? "—"}</td>
                  <td className="p-2">{r.email ?? "—"}</td>
                  <td className="p-2 whitespace-nowrap">{celularPrincipal}</td>
                  <td className="p-2 whitespace-nowrap">{celularCoarrendatario}</td>
                  <td className="p-2">{ingresosTotales > 0 ? formatCurrency(ingresosTotales) : "—"}</td>
                  <td className="p-2">{personas > 0 ? personas : "—"}</td>
                  <td className="p-2">{ninos > 0 ? ninos : "—"}</td>
                  <td className="p-2">{mascotas > 0 ? mascotas : "—"}</td>
                  <td className="p-2 max-w-[150px] truncate" title={empresa}>{empresa}</td>
                  <td className="p-2">
                    {r.completado ? (
                      <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 text-xs font-medium">
                        {t.mensajes.completado}
                      </span>
                    ) : r.descartado ? (
                      <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium" title={r.motivo_descarte ?? undefined}>
                        {t.mensajes.noAceptado}
                      </span>
                    ) : r.gestionado ? (
                      <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">Gestionado</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">Pendiente</span>
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onVerDetalle(r)}
                        className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        {t.mensajes.verDetalle}
                      </button>
                      {onCompletar && !r.completado && !r.descartado && (
                        <button
                          onClick={async () => {
                            setProcesandoCompletarId(r.id)
                            await onCompletar(r.id)
                            setProcesandoCompletarId(null)
                          }}
                          disabled={procesandoCompletarId === r.id}
                          className="rounded border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          title={t.mensajes.marcarCompletado}
                        >
                          {procesandoCompletarId === r.id ? t.mensajes.procesando : t.mensajes.marcarCompletado}
                        </button>
                      )}
                      {onDescompletar && r.completado && (
                        <button
                          onClick={async () => {
                            setProcesandoCompletarId(r.id)
                            await onDescompletar(r.id)
                            setProcesandoCompletarId(null)
                          }}
                          disabled={procesandoCompletarId === r.id}
                          className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          title={t.mensajes.reabrirCompletado}
                        >
                          {procesandoCompletarId === r.id ? t.mensajes.procesando : t.mensajes.reabrirCompletado}
                        </button>
                      )}
                      {onEliminar && (
                        <button
                          onClick={() => {
                            setErrorEliminar(null)
                            setConfirmando(r)
                          }}
                          className="rounded border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors"
                          title={t.mensajes.eliminar}
                        >
                          {t.mensajes.eliminar}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {confirmando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (!eliminando) {
              setConfirmando(null)
              setErrorEliminar(null)
            }
          }}
        >
          <div
            className="bg-background rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
              {t.mensajes.eliminarTitulo}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {t.mensajes.eliminarMensaje}
            </p>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm mb-4">
              <p className="text-xs text-muted-foreground">{t.mensajes.eliminarRegistroDe}</p>
              <p className="font-medium">{confirmando.nombre ?? "—"}</p>
              {confirmando.cedula && (
                <p className="text-xs text-muted-foreground">{confirmando.cedula}</p>
              )}
            </div>
            {errorEliminar && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
                {errorEliminar}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => {
                  setConfirmando(null)
                  setErrorEliminar(null)
                }}
                className="rounded-lg px-4 py-1.5 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t.comun.cancelar ?? "Cancelar"}
              </button>
              <button
                type="button"
                disabled={eliminando || !onEliminar}
                onClick={async () => {
                  if (!onEliminar || !confirmando) return
                  setEliminando(true)
                  setErrorEliminar(null)
                  const result = await onEliminar(confirmando.id)
                  if (result.ok) {
                    setConfirmando(null)
                  } else {
                    setErrorEliminar(result.error ?? t.mensajes.errorProceso)
                  }
                  setEliminando(false)
                }}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors ${
                  eliminando
                    ? "bg-red-400 cursor-wait opacity-80"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {eliminando ? t.mensajes.eliminando : t.mensajes.confirmarEliminacion}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Modal de detalle de intake ─────────────────────────────────────────────

export function ModalDetalleIntake({
  registro,
  role,
  onCerrar,
  onPasarArrendatario,
  onDescartar,
  onEditarMotivo,
  onReactivar,
  onCompletar,
  onDescompletar,
}: {
  registro: IntakeFormulario
  role: UserRole
  onCerrar: () => void
  onPasarArrendatario: (id: string) => Promise<{ ok: boolean; email?: string; error?: string }>
  onDescartar?: (id: string, motivo: string) => Promise<{ ok: boolean; error?: string }>
  onEditarMotivo?: (id: string, motivo: string) => Promise<{ ok: boolean; error?: string }>
  onReactivar?: (id: string) => Promise<{ ok: boolean; error?: string }>
  onCompletar?: (id: string) => Promise<{ ok: boolean; error?: string }>
  onDescompletar?: (id: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const { t } = useLang()
  const [pasando, setPasando] = useState(false)
  const [pasadoOk, setPasadoOk] = useState<string | null>(null)
  const [pasadoError, setPasadoError] = useState<string | null>(null)
  const [mostrarFormDescarte, setMostrarFormDescarte] = useState(false)
  const [motivoDescarte, setMotivoDescarte] = useState<string>("")
  const [modoEdicionMotivo, setModoEdicionMotivo] = useState(false)
  const [guardandoDescarte, setGuardandoDescarte] = useState(false)
  const [errorDescarte, setErrorDescarte] = useState<string | null>(null)
  const [reactivando, setReactivando] = useState(false)
  const [completando, setCompletando] = useState(false)
  const [errorCompletar, setErrorCompletar] = useState<string | null>(null)

  const formatDate = (dateStr: string | null | undefined) => formatearFechaDMY(dateStr)

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—"
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
  }

  // Calcular ingresos totales sumando ambos salarios
  const salarioPrincipal = registro.salario_principal ?? registro.salario ?? 0
  const salarioSecundario = registro.salario_secundario ?? registro.salario_2 ?? 0
  const ingresosTotales = salarioPrincipal + salarioSecundario

  // Aviso: el inquilino quiere ocupar el inmueble en menos de 5 días hábiles
  // desde la fecha de envío de la solicitud. Informativo para el propietario.
  const diasHabilesParaIngreso =
    registro.fecha_ingreso_deseada
      ? diasHabilesEntre(registro.fecha_envio ?? registro.created_at, registro.fecha_ingreso_deseada)
      : null
  const ingresoUrgente =
    diasHabilesParaIngreso !== null && diasHabilesParaIngreso < 5

  // Resultado del score para resaltar campos vacíos, "Independiente" y aviso RUT
  const resultadoScore = calcularScore(registro)
  const camposVaciosSet: Set<string> =
    !resultadoScore.sinCanon && !resultadoScore.excluido
      ? resultadoScore.score.flags.camposVacios
      : new Set<string>()
  const empresaPrincipalIndependiente =
    !resultadoScore.sinCanon && !resultadoScore.excluido
      ? resultadoScore.score.flags.empresaPrincipalIndependiente
      : false
  const empresaSecundariaIndependiente =
    !resultadoScore.sinCanon && !resultadoScore.excluido
      ? resultadoScore.score.flags.empresaSecundariaIndependiente
      : false
  const negocioEnPropiedad =
    !resultadoScore.sinCanon && !resultadoScore.excluido
      ? resultadoScore.score.flags.negocioEnPropiedad
      : false
  const mostrarAvisoIndependiente = empresaPrincipalIndependiente || empresaSecundariaIndependiente

  const faltaClass = "inline-block bg-amber-100/70 dark:bg-amber-900/40 border-l-2 border-amber-500 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-200"
  const renderValor = (key: string, valor: ReactNode, raw: unknown) => {
    const falta = camposVaciosSet.has(key) || esVacio(raw)
    if (falta) {
      return (
        <span className={faltaClass} title={t.mensajes.calificacion.campoFaltante}>
          {t.mensajes.calificacion.campoFaltante}
        </span>
      )
    }
    return <>{valor ?? "—"}</>
  }

  const badgeIndependiente = (
    <span className="ml-2 inline-block rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
      {t.mensajes.calificacion.badgeIndependiente}
    </span>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">{registro.nombre ?? t.comun.sinDatos}</h2>
            <p className="text-sm text-muted-foreground">{t.mensajes.detalle.recibido} {formatDate(registro.created_at)}</p>
            {(registro.propiedad_id || registro.id_inmueble) && (
              <p className="text-xs text-muted-foreground">
                {t.mensajes.comparacion.inmueble} {registro.propiedad_id ?? registro.id_inmueble}
                {registro.valor_arriendo ? ` — ${t.mensajes.comparacion.canon} ${formatCurrency(registro.valor_arriendo)}` : ""}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {registro.completado ? (
                <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 text-xs font-medium">
                  {t.mensajes.completado}
                </span>
              ) : registro.descartado ? (
                <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium">{t.mensajes.noAceptado}</span>
              ) : registro.gestionado ? (
                <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">Gestionado</span>
              ) : (
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">Pendiente de gestión</span>
              )}
              {(registro.rechazos_previos?.length ?? 0) > 0 && (
                <span
                  className="rounded-full bg-red-500/15 text-red-700 dark:text-red-300 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                  title={registro.rechazos_previos!.map((rp) => rp.motivo_descarte ?? "—").join(" | ")}
                >
                  {t.mensajes.reincidenteBadge}
                </span>
              )}
            </div>
          </div>
          <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground text-2xl leading-none" aria-label="Cerrar">×</button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 text-sm">
          {/* Información de contacto */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide border-b pb-1">Información de Contacto</p>
            <p><span className="font-medium">Email:</span> {renderValor("email", registro.email, registro.email)}</p>
            <p><span className="font-medium">Teléfono:</span> {renderValor("telefono", registro.telefono, registro.telefono)}</p>
            <p><span className="font-medium">Cédula:</span> {renderValor("cedula", registro.cedula, registro.cedula)}</p>
            <p><span className="font-medium">Fecha Expedición:</span> {renderValor("cedula_ciudad_expedicion", formatearFechaDMY(registro.cedula_ciudad_expedicion ?? registro.fecha_expedicion_cedula), registro.cedula_ciudad_expedicion ?? registro.fecha_expedicion_cedula)}</p>
          </div>

          {/* Información financiera */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide border-b pb-1">Información Financiera</p>
            <p><span className="font-medium">Ingresos totales:</span> <strong className="text-green-600 dark:text-green-400">{formatCurrency(ingresosTotales)}</strong></p>
            <p><span className="font-medium">Salario principal:</span> {renderValor("salario_principal", formatCurrency(salarioPrincipal), registro.salario_principal ?? registro.salario)}</p>
            <p><span className="font-medium">Salario secundario:</span> {salarioSecundario > 0 ? formatCurrency(salarioSecundario) : (registro.coarrendatario_nombre || registro.nombre_coarrendatario ? renderValor("salario_secundario", formatCurrency(salarioSecundario), registro.salario_secundario ?? registro.salario_2) : "—")}</p>
            <p>
              <span className="font-medium">Empresa principal:</span>{" "}
              {renderValor("empresa_principal", registro.empresa_principal ?? registro.empresa_arrendatario, registro.empresa_principal ?? registro.empresa_arrendatario)}
              {empresaPrincipalIndependiente && badgeIndependiente}
            </p>
            <p><span className="font-medium">Antigüedad (meses):</span> {renderValor("tiempo_servicio_principal_meses", registro.tiempo_servicio_principal_meses ?? registro.antiguedad_meses, registro.tiempo_servicio_principal_meses ?? registro.antiguedad_meses)}</p>
            <p><span className="font-medium">Personas que trabajan:</span> {renderValor("personas_trabajan", registro.personas_trabajan, registro.personas_trabajan)}</p>
          </div>

          {/* Grupo familiar */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide border-b pb-1">Grupo Familiar</p>
            <p><span className="font-medium">Adultos habitantes:</span> {renderValor("adultos_habitantes", registro.adultos_habitantes ?? registro.personas, registro.adultos_habitantes ?? registro.personas)}</p>
            <p><span className="font-medium">Niños habitantes:</span> {renderValor("ninos_habitantes", registro.ninos_habitantes ?? registro.ninos, registro.ninos_habitantes ?? registro.ninos)}</p>
            <p><span className="font-medium">Total personas:</span> {(registro.adultos_habitantes ?? registro.personas ?? 0) + (registro.ninos_habitantes ?? registro.ninos ?? 0)}</p>
            <p><span className="font-medium">Mascotas:</span> {renderValor("mascotas_cantidad", registro.mascotas_cantidad ?? registro.mascotas, registro.mascotas_cantidad ?? registro.mascotas)}</p>
            <p
              className={
                negocioEnPropiedad
                  ? "rounded border-l-4 border-red-500 bg-red-100/70 dark:bg-red-900/40 px-2 py-1 font-semibold text-red-800 dark:text-red-200"
                  : ""
              }
            >
              <span className="font-medium">Negocio en propiedad:</span> {registro.negocio ?? "—"}
            </p>
            <p>
              <span className="font-medium">Fecha deseada de ingreso:</span>{" "}
              {formatearFechaDMY(registro.fecha_ingreso_deseada)}
            </p>
          </div>

          {/* Único arrendatario — motivo de estudio */}
          {registro.unico_arrendatario === true && (
            <div className="space-y-2 p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg border-2 border-amber-400 dark:border-amber-700">
              <p className="font-semibold text-amber-700 dark:text-amber-300 uppercase text-xs tracking-wide border-b border-amber-300 dark:border-amber-700 pb-1">
                Motivo de estudio — único arrendatario
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-100">
                El aplicante declaró que <strong>será la única persona</strong> que vivirá en el
                inmueble. No se registran datos de coarrendatario.
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                Evaluar capacidad de pago sin codeudor y considerar solicitar garantías adicionales.
              </p>
            </div>
          )}

          {/* Coarrendatario */}
          {registro.unico_arrendatario !== true && (registro.coarrendatario_nombre || registro.nombre_coarrendatario || registro.coarrendatario_cedula || registro.cedula_coarrendatario) && (
            <div className="space-y-2 p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="font-semibold text-blue-700 dark:text-blue-300 uppercase text-xs tracking-wide border-b border-blue-200 dark:border-blue-800 pb-1">Coarrendatario</p>
              <p><span className="font-medium">Nombre completo:</span> {registro.coarrendatario_nombre ?? registro.nombre_coarrendatario ?? "—"}</p>
              <p><span className="font-medium">Cédula:</span> {registro.coarrendatario_cedula ?? registro.cedula_coarrendatario ?? "—"}</p>
              <p><span className="font-medium">Fecha expedición:</span> {formatearFechaDMY(registro.coarrendatario_cedula_expedicion ?? registro.fecha_expedicion_cedula_coarrendatario)}</p>
              <p><span className="font-medium">Email:</span> {renderValor("coarrendatario_email", registro.coarrendatario_email, registro.coarrendatario_email)}</p>
              <p><span className="font-medium">Teléfono:</span> {renderValor("coarrendatario_telefono", registro.coarrendatario_telefono ?? registro.telefono_coarrendatario, registro.coarrendatario_telefono ?? registro.telefono_coarrendatario)}</p>
              <p>
                <span className="font-medium">Empresa:</span>{" "}
                {renderValor("empresa_secundaria", registro.empresa_secundaria ?? registro.empresa_coarrendatario, registro.empresa_secundaria ?? registro.empresa_coarrendatario)}
                {empresaSecundariaIndependiente && badgeIndependiente}
              </p>
              <p><span className="font-medium">Antigüedad (meses):</span> {renderValor("tiempo_servicio_secundario_meses", registro.tiempo_servicio_secundario_meses ?? registro.antiguedad_meses_2, registro.tiempo_servicio_secundario_meses ?? registro.antiguedad_meses_2)}</p>
            </div>
          )}

          {/* Datos adicionales */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide border-b pb-1">Datos Adicionales</p>
            <p><span className="font-medium">ID Inmueble:</span> {registro.id_inmueble ?? "—"}</p>
            <p><span className="font-medium">ID Propiedad:</span> {registro.propiedad_id ?? "—"}</p>
            <p><span className="font-medium">Fecha de envío:</span> {registro.fecha_envio ? formatDate(registro.fecha_envio) : "—"}</p>
            <p><span className="font-medium">Empresas:</span> {registro.empresas ?? "—"}</p>
          </div>

          {/* Autorización */}
          <div className="space-y-2 p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="font-semibold text-amber-700 dark:text-amber-300 uppercase text-xs tracking-wide border-b border-amber-200 dark:border-amber-800 pb-1">Autorización de Datos</p>
            <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
              {registro.autorizacion || "No registrada"}
            </p>
            {mostrarAvisoIndependiente && (
              <div className="mt-2 rounded border border-amber-500 bg-amber-100/70 dark:bg-amber-900/40 p-2 text-xs font-semibold text-amber-900 dark:text-amber-100">
                {t.mensajes.calificacion.avisoIndependiente}
              </div>
            )}
            {registro.descartado && (
              <div className="mt-3 rounded border border-red-500 bg-red-50 dark:bg-red-950/40 p-2 text-xs">
                <p className="font-bold text-red-700 dark:text-red-300 mb-0.5">{t.mensajes.rechazado}</p>
                <p className="text-red-800 dark:text-red-200 whitespace-pre-wrap break-words">
                  {registro.motivo_descarte || t.mensajes.sinMotivoRegistrado}
                </p>
                {registro.descartado_at && (
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDate(registro.descartado_at)}</p>
                )}
              </div>
            )}
            {(registro.rechazos_previos?.length ?? 0) > 0 && (
              <div className="mt-3 rounded border-2 border-red-600 bg-red-100/70 dark:bg-red-950/50 p-2 text-xs">
                <p className="font-bold text-red-700 dark:text-red-300 mb-1">
                  {t.mensajes.rechazoPrevioAviso}
                </p>
                <ul className="space-y-1 list-disc pl-4 text-red-900 dark:text-red-100">
                  {registro.rechazos_previos!.map((rp) => (
                    <li key={rp.id}>
                      <span className="font-semibold">
                        {rp.descartado_at ? formatDate(rp.descartado_at) : "Sin fecha"}:
                      </span>{" "}
                      <span className="whitespace-pre-wrap break-words">
                        {rp.motivo_descarte || t.mensajes.sinMotivoRegistrado}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Raw data (para debug) */}
        {(registro.raw_data || registro.data) && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Ver datos adicionales del formulario
            </summary>
            <div className="mt-2 p-3 bg-muted/50 rounded text-xs font-mono overflow-x-auto">
              <pre>{JSON.stringify(registro.raw_data || registro.data, null, 2)}</pre>
            </div>
          </details>
        )}

        <SeccionCalificacion registro={registro} />

        {ingresoUrgente && (
          <div className="mt-4 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 p-4">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
              Nota: ingreso solicitado en menos de 5 días hábiles
            </p>
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              El aplicante indicó que quiere ocupar el inmueble el{" "}
              <strong>{formatearFechaDMY(registro.fecha_ingreso_deseada)}</strong>
              {diasHabilesParaIngreso != null && (
                <>
                  {" "}(a{" "}
                  <strong>
                    {diasHabilesParaIngreso} día{diasHabilesParaIngreso === 1 ? "" : "s"} hábil
                    {diasHabilesParaIngreso === 1 ? "" : "es"}
                  </strong>{" "}
                  desde la fecha de envío)
                </>
              )}
              . Tenlo en cuenta para coordinar la entrega.
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t space-y-3">
          {pasadoOk && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
              {t.mensajes.creadoOk} <strong>{pasadoOk}</strong>
            </div>
          )}
          {pasadoError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
              {pasadoError}
            </div>
          )}
          {errorDescarte && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
              {errorDescarte}
            </div>
          )}
          {errorCompletar && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
              {errorCompletar}
            </div>
          )}

          {mostrarFormDescarte && (onDescartar || onEditarMotivo) && (
            <div className="rounded-lg border border-red-400 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
              <label className="text-sm font-medium text-red-800 dark:text-red-300">
                {t.mensajes.motivoRechazo}
              </label>
              <textarea
                value={motivoDescarte}
                onChange={(e) => setMotivoDescarte(e.target.value)}
                rows={3}
                placeholder={t.mensajes.motivoRechazoPlaceholder}
                className="w-full rounded border border-red-300 dark:border-red-700 bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormDescarte(false)
                    setModoEdicionMotivo(false)
                    setErrorDescarte(null)
                  }}
                  disabled={guardandoDescarte}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  {t.comun.cancelar ?? "Cancelar"}
                </button>
                <button
                  type="button"
                  disabled={!motivoDescarte.trim() || guardandoDescarte}
                  onClick={async () => {
                    const motivo = motivoDescarte.trim()
                    if (!motivo) return
                    setGuardandoDescarte(true)
                    setErrorDescarte(null)
                    const fn = modoEdicionMotivo ? onEditarMotivo : onDescartar
                    const result = fn
                      ? await fn(registro.id, motivo)
                      : { ok: false, error: t.mensajes.errorProceso }
                    if (result.ok) {
                      setMostrarFormDescarte(false)
                      setModoEdicionMotivo(false)
                    } else {
                      setErrorDescarte(result.error ?? t.mensajes.errorProceso)
                    }
                    setGuardandoDescarte(false)
                  }}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors ${
                    !motivoDescarte.trim() || guardandoDescarte
                      ? "bg-red-400 cursor-not-allowed opacity-60"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {guardandoDescarte
                    ? t.mensajes.procesando
                    : modoEdicionMotivo
                    ? t.mensajes.editarMotivo
                    : t.mensajes.confirmarRechazo}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {t.mensajes.detalle.autorizacion} {registro.autorizacion ? registro.autorizacion.slice(0, 60) + "…" : "—"}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {registro.completado && onDescompletar && (
                <button
                  type="button"
                  disabled={completando}
                  onClick={async () => {
                    setCompletando(true)
                    setErrorCompletar(null)
                    const result = await onDescompletar(registro.id)
                    if (!result.ok) setErrorCompletar(result.error ?? t.mensajes.errorProceso)
                    setCompletando(false)
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                    completando ? "bg-amber-400 cursor-wait opacity-80" : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  {completando ? t.mensajes.procesando : t.mensajes.reabrirCompletado}
                </button>
              )}
              {!registro.completado && !registro.descartado && onCompletar && (
                <button
                  type="button"
                  disabled={completando}
                  onClick={async () => {
                    setCompletando(true)
                    setErrorCompletar(null)
                    const result = await onCompletar(registro.id)
                    if (!result.ok) setErrorCompletar(result.error ?? t.mensajes.errorProceso)
                    setCompletando(false)
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                    completando ? "bg-blue-400 cursor-wait opacity-80" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {completando ? t.mensajes.procesando : t.mensajes.marcarCompletado}
                </button>
              )}
              {registro.descartado ? (
                <>
                  {onEditarMotivo && (
                    <button
                      type="button"
                      onClick={() => {
                        setMotivoDescarte(registro.motivo_descarte ?? "")
                        setModoEdicionMotivo(true)
                        setMostrarFormDescarte(true)
                        setErrorDescarte(null)
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                      {t.mensajes.editarMotivo}
                    </button>
                  )}
                  {onReactivar && (
                    <button
                      type="button"
                      disabled={reactivando}
                      onClick={async () => {
                        setReactivando(true)
                        setErrorDescarte(null)
                        const result = await onReactivar(registro.id)
                        if (!result.ok) {
                          setErrorDescarte(result.error ?? t.mensajes.errorProceso)
                        }
                        setReactivando(false)
                      }}
                      className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                        reactivando
                          ? "bg-primary/60 cursor-wait opacity-80"
                          : "bg-primary hover:bg-primary/90"
                      }`}
                    >
                      {reactivando ? t.mensajes.procesando : t.mensajes.reactivar}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {onDescartar && (
                    <button
                      type="button"
                      disabled={pasando || !!pasadoOk || mostrarFormDescarte}
                      onClick={() => {
                        setMotivoDescarte("")
                        setModoEdicionMotivo(false)
                        setMostrarFormDescarte(true)
                        setErrorDescarte(null)
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {t.mensajes.noAceptar}
                    </button>
                  )}
                  <button
                    disabled={pasando || !!pasadoOk}
                    onClick={async () => {
                      setPasando(true)
                      setPasadoOk(null)
                      setPasadoError(null)
                      const result = await onPasarArrendatario(registro.id)
                      if (result.ok) {
                        setPasadoOk(result.email ?? "—")
                      } else {
                        setPasadoError(result.error ?? t.mensajes.errorProceso)
                      }
                      setPasando(false)
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      pasadoOk
                        ? "bg-green-600/40 text-green-900 dark:text-green-300 cursor-not-allowed opacity-60"
                        : pasando
                        ? "bg-primary/60 text-primary-foreground cursor-wait opacity-80"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                    }`}
                  >
                    {pasando ? t.mensajes.procesando : pasadoOk ? t.mensajes.creado : t.mensajes.pasarArrendatario}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

