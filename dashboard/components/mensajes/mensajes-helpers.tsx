"use client"

import { useState } from "react"
import type { IntakeFormulario } from "@/lib/types/database"
import type { UserRole } from "@/lib/auth/role"
import { useLang } from "@/lib/i18n/context"

// ── Tipos del scoring ──────────────────────────────────────────────────────

type FiltroExcluyente = { aplica: true; motivo: string }

type ScoreDetalle = {
  capacidadPago: { puntos: number; descripcion: string }
  estabilidadLaboral: { puntos: number; descripcion: string }
  composicionHogar: { puntos: number; descripcion: string }
  mascotas: { puntos: number; descripcion: string }
  total: number
  etiqueta: string
  nivel: "verde" | "amarillo" | "rojo"
}

export type ResultadoScore =
  | { excluido: true; filtro: FiltroExcluyente; sinCanon?: false }
  | { excluido: false; sinCanon: true }
  | { excluido: false; sinCanon: false; score: ScoreDetalle }

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
  if (r.negocio && r.negocio.trim() !== "" && r.negocio.trim().toLowerCase() !== "no") {
    return { excluido: true, filtro: { aplica: true, motivo: `Uso no residencial indicado: "${r.negocio}"` } }
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

  const personas = r.adultos_habitantes ?? r.personas ?? 1
  let ptsHogar = 0; let descHogar = ""
  if (personas <= 3) { ptsHogar = 15; descHogar = `${personas} personas — Ideal` }
  else if (personas === 4) { ptsHogar = 10; descHogar = `${personas} personas — A evaluar` }
  else { ptsHogar = 5; descHogar = `${personas} personas — Riesgo` }

  const mascotas = r.mascotas_cantidad ?? r.mascotas ?? 0
  let ptsMascotas = 0; let descMascotas = ""
  if (mascotas === 0) { ptsMascotas = 15; descMascotas = "Sin mascotas — Ideal" }
  else if (mascotas === 1) { ptsMascotas = 10; descMascotas = "1 mascota — A evaluar" }
  else { ptsMascotas = 5; descMascotas = `${mascotas} mascotas — Riesgo` }

  const total = ptsPago + ptsLaboral + ptsHogar + ptsMascotas
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
    { label: t.mensajes.calificacion.mascotas, max: 15, ...score.mascotas },
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
                <th className="text-right p-2 font-medium">{t.mensajes.calificacion.mascotas}<br /><span className="font-normal text-muted-foreground text-xs">/15</span></th>
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
                      <td colSpan={5} className="p-2 text-center text-muted-foreground text-xs">{t.mensajes.comparacion.sinPropiedad}</td>
                      <td className="p-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t.mensajes.comparacion.sinDatos}</span></td>
                    </tr>
                  )
                }
                if (resultado.excluido) {
                  return (
                    <tr key={r.id} className={rowClass}>
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-medium">{r.nombre ?? "—"}</td>
                      <td colSpan={5} className="p-2 text-xs text-red-600 dark:text-red-400 truncate max-w-[200px]" title={resultado.filtro.motivo}>{resultado.filtro.motivo}</td>
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
              <th className="text-left p-2 font-medium">Email</th>
              <th className="text-left p-2 font-medium">Ingresos</th>
              <th className="text-left p-2 font-medium">Personas</th>
              <th className="text-left p-2 font-medium">Mascotas</th>
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

              return (
                <tr
                  key={r.id}
                  className={`border-b transition-colors ${seleccionados.has(r.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}
                >
                  <td className="p-2">
                    <input type="checkbox" checked={seleccionados.has(r.id)} onChange={() => onToggle(r.id)} className="rounded" />
                  </td>
                  <td className="p-2 font-medium">{r.nombre ?? "—"}</td>
                  <td className="p-2">{r.email ?? "—"}</td>
                  <td className="p-2">{ingresosTotales > 0 ? formatCurrency(ingresosTotales) : "—"}</td>
                  <td className="p-2">{personas > 0 ? personas : "—"}</td>
                  <td className="p-2">{mascotas > 0 ? mascotas : "—"}</td>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
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
          </div>
          <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground text-2xl leading-none" aria-label="Cerrar">×</button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">{t.mensajes.detalle.contacto}</p>
            <p><span className="font-medium">{t.mensajes.detalle.email}</span> {registro.email ?? "—"}</p>
            <p><span className="font-medium">{t.mensajes.detalle.telefono}</span> {registro.telefono ?? "—"}</p>
            <p><span className="font-medium">{t.mensajes.detalle.cedula}</span> {registro.cedula ?? "—"}</p>
            <p><span className="font-medium">{t.mensajes.detalle.fechaExpCedula}</span> {registro.cedula_ciudad_expedicion ?? registro.fecha_expedicion_cedula ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">{t.mensajes.detalle.infoFinanciera}</p>
            <p><span className="font-medium">{t.mensajes.detalle.ingresos}</span> {formatCurrency(registro.ingresos)}</p>
            <p><span className="font-medium">{t.mensajes.detalle.salarioPrincipal}</span> {formatCurrency(registro.salario_principal ?? registro.salario)}</p>
            <p><span className="font-medium">{t.mensajes.detalle.salarioSecundario}</span> {formatCurrency(registro.salario_secundario ?? registro.salario_2)}</p>
            <p><span className="font-medium">{t.mensajes.detalle.empresa}</span> {registro.empresa_principal ?? registro.empresa_arrendatario ?? registro.empresas ?? "—"}</p>
            <p><span className="font-medium">{t.mensajes.detalle.antiguedad}</span> {registro.tiempo_servicio_principal_meses ?? registro.antiguedad_meses ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">{t.mensajes.detalle.grupoFamiliar}</p>
            <p><span className="font-medium">{t.mensajes.detalle.personasTotales}</span> {registro.adultos_habitantes ?? registro.personas ?? "—"}</p>
            <p><span className="font-medium">{t.mensajes.detalle.personasTrabajan}</span> {registro.personas_trabajan ?? "—"}</p>
            <p><span className="font-medium">{t.mensajes.detalle.ninos}</span> {registro.ninos_habitantes ?? registro.ninos ?? "—"}</p>
            <p><span className="font-medium">{t.mensajes.detalle.mascotasLabel}</span> {registro.mascotas_cantidad ?? registro.mascotas ?? "—"}</p>
            <p><span className="font-medium">{t.mensajes.detalle.negocio}</span> {registro.negocio ?? "—"}</p>
          </div>
          {(registro.coarrendatario_nombre || registro.nombre_coarrendatario || registro.coarrendatario_cedula || registro.cedula_coarrendatario) && (
            <div className="space-y-1">
              <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">{t.mensajes.detalle.coarrendatario}</p>
              <p><span className="font-medium">{t.mensajes.columnas.nombre}:</span> {registro.coarrendatario_nombre ?? registro.nombre_coarrendatario ?? "—"}</p>
              <p><span className="font-medium">{t.mensajes.detalle.cedula}</span> {registro.coarrendatario_cedula ?? registro.cedula_coarrendatario ?? "—"}</p>
              <p><span className="font-medium">{t.mensajes.detalle.telefono}</span> {registro.coarrendatario_telefono ?? registro.telefono_coarrendatario ?? "—"}</p>
              <p><span className="font-medium">Empresa:</span> {registro.empresa_secundaria ?? registro.empresa_coarrendatario ?? "—"}</p>
            </div>
          )}
        </div>

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

