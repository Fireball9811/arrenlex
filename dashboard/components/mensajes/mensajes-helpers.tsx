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

  const ratio = canon > 0 ? ingresoTotal / canon : 0
  let ptsPago = 0; let descPago = ""
  if (ratio >= 3) { ptsPago = 50; descPago = `${ratio.toFixed(1)}x canon — Excelente` }
  else if (ratio >= 2) { ptsPago = 38; descPago = `${ratio.toFixed(1)}x canon — Aceptable` }
  else if (ratio >= 1.5) { ptsPago = 30; descPago = `${ratio.toFixed(1)}x canon — Adecuado` }
  else { ptsPago = 20; descPago = `${ratio.toFixed(1)}x canon — Mínimo aceptable` }

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

  const total = ptsPago + ptsLaboral + ptsHogar + ptsMascotas + ptsOtros

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
      },
      total, etiqueta, nivel,
    },
  }
}

// ── Componente de calificación ─────────────────────────────────────────────

export function SeccionCalificacion({ registro }: { registro: IntakeFormulario }) {
  const resultado = calcularScore(registro)
  const { t } = useLang()

  if (resultado.sinCanon) {
    return (
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.mensajes.calificacion.titulo}</p>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {t.mensajes.calificacion.sinCanonMsg}
        </div>
      </div>
    )
  }
  if (resultado.excluido) {
    return (
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t.mensajes.calificacion.titulo}</p>
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">{t.mensajes.calificacion.rechazado}</p>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">{resultado.filtro.motivo}</p>
        </div>
      </div>
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
    <div className="mt-6 pt-4 border-t">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Calificación ARRENLEX</p>
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
}) {
  const { t } = useLang()
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
              <th className="text-left p-2 font-medium">Ingresos</th>
              <th className="text-left p-2 font-medium">Personas</th>
              <th className="text-left p-2 font-medium">Mascotas</th>
              <th className="text-left p-2 font-medium">Empresa</th>
              <th className="text-left p-2 font-medium">Estado</th>
              <th className="text-left p-2 font-medium">Fecha (Bogotá)</th>
              <th className="text-left p-2 font-medium">{t.mensajes.columnas.acciones}</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => {
              const salarioPrincipal = r.salario_principal ?? r.salario ?? 0
              const salarioSecundario = r.salario_secundario ?? r.salario_2 ?? 0
              const ingresosTotales = salarioPrincipal + salarioSecundario
              const personas = r.adultos_habitantes ?? r.personas ?? 0
              const mascotas = r.mascotas_cantidad ?? r.mascotas ?? 0
              const empresa = r.empresa_principal ?? r.empresa_arrendatario ?? r.empresas ?? "—"

              return (
                <tr
                  key={r.id}
                  className={`border-b transition-colors ${seleccionados.has(r.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}
                >
                  <td className="p-2">
                    <input type="checkbox" checked={seleccionados.has(r.id)} onChange={() => onToggle(r.id)} className="rounded" />
                  </td>
                  <td className="p-2 font-medium">{r.nombre ?? "—"}</td>
                  <td className="p-2">{r.cedula ?? "—"}</td>
                  <td className="p-2">{r.email ?? "—"}</td>
                  <td className="p-2">{ingresosTotales > 0 ? formatCurrency(ingresosTotales) : "—"}</td>
                  <td className="p-2">{personas > 0 ? personas : "—"}</td>
                  <td className="p-2">{mascotas > 0 ? mascotas : "—"}</td>
                  <td className="p-2 max-w-[150px] truncate" title={empresa}>{empresa}</td>
                  <td className="p-2">
                    {r.gestionado ? (
                      <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">Gestionado</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">Pendiente</span>
                    )}
                  </td>
                  <td className="p-2">{formatDate(r.created_at)}</td>
                  <td className="p-2">
                    <button
                      onClick={() => onVerDetalle(r)}
                      className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {t.mensajes.verDetalle}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Modal de detalle de intake ─────────────────────────────────────────────

export function ModalDetalleIntake({
  registro,
  role,
  onCerrar,
  onPasarArrendatario,
}: {
  registro: IntakeFormulario
  role: UserRole
  onCerrar: () => void
  onPasarArrendatario: (id: string) => Promise<{ ok: boolean; email?: string; error?: string }>
}) {
  const { t } = useLang()
  const [pasando, setPasando] = useState(false)
  const [pasadoOk, setPasadoOk] = useState<string | null>(null)
  const [pasadoError, setPasadoError] = useState<string | null>(null)

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
        timeZone: "America/Bogota",
      })
    } catch { return dateStr }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—"
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
  }

  // Calcular ingresos totales sumando ambos salarios
  const salarioPrincipal = registro.salario_principal ?? registro.salario ?? 0
  const salarioSecundario = registro.salario_secundario ?? registro.salario_2 ?? 0
  const ingresosTotales = salarioPrincipal + salarioSecundario

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
            <div className="mt-2">
              {registro.gestionado ? (
                <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">Gestionado</span>
              ) : (
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">Pendiente de gestión</span>
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
            <p><span className="font-medium">Ciudad Expedición:</span> {renderValor("cedula_ciudad_expedicion", registro.cedula_ciudad_expedicion ?? registro.fecha_expedicion_cedula, registro.cedula_ciudad_expedicion ?? registro.fecha_expedicion_cedula)}</p>
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
          </div>

          {/* Coarrendatario */}
          {(registro.coarrendatario_nombre || registro.nombre_coarrendatario || registro.coarrendatario_cedula || registro.cedula_coarrendatario) && (
            <div className="space-y-2 p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="font-semibold text-blue-700 dark:text-blue-300 uppercase text-xs tracking-wide border-b border-blue-200 dark:border-blue-800 pb-1">Coarrendatario</p>
              <p><span className="font-medium">Nombre completo:</span> {registro.coarrendatario_nombre ?? registro.nombre_coarrendatario ?? "—"}</p>
              <p><span className="font-medium">Cédula:</span> {registro.coarrendatario_cedula ?? registro.cedula_coarrendatario ?? "—"}</p>
              <p><span className="font-medium">Ciudad expedición:</span> {registro.coarrendatario_cedula_expedicion ?? registro.fecha_expedicion_cedula_coarrendatario ?? "—"}</p>
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
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {t.mensajes.detalle.autorizacion} {registro.autorizacion ? registro.autorizacion.slice(0, 60) + "…" : "—"}
            </p>
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
          </div>
        </div>
      </div>
    </div>
  )
}

