"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SolicitudVisitaConPropiedad, IntakeFormulario } from "@/lib/types/database"
import type { UserRole } from "@/lib/auth/role"
import { useLang } from "@/lib/i18n/context"

const STATUS_VALUES = ["pendiente", "contestado", "esperando"] as const

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

type ResultadoScore =
  | { excluido: true; filtro: FiltroExcluyente; sinCanon?: false }
  | { excluido: false; sinCanon: true }
  | { excluido: false; sinCanon: false; score: ScoreDetalle }

// ── Función pura de scoring ────────────────────────────────────────────────

function calcularScore(r: IntakeFormulario): ResultadoScore {
  const canon = r.valor_arriendo
  if (canon == null) return { excluido: false, sinCanon: true }

  // Mapeo de campos para compatibilidad con nombres antiguos y nuevos
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

  // Validación de ingresos: mínimo 1.2x el canon (reducido de 1.5x para ser más flexible)
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

// ── Componente de calificación en modal detalle ────────────────────────────

function SeccionCalificacion({ registro }: { registro: IntakeFormulario }) {
  const resultado = calcularScore(registro)

  const { t: tCal } = useLang()

  if (resultado.sinCanon) {
    return (
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{tCal.mensajes.calificacion.titulo}</p>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {tCal.mensajes.calificacion.sinCanonMsg}
        </div>
      </div>
    )
  }
  if (resultado.excluido) {
    return (
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{tCal.mensajes.calificacion.titulo}</p>
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">{tCal.mensajes.calificacion.rechazado}</p>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">{resultado.filtro.motivo}</p>
        </div>
      </div>
    )
  }

  const { score } = resultado
  const colorTotal = score.nivel === "verde" ? "text-green-600 dark:text-green-400" : score.nivel === "amarillo" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
  const bgBarra = score.nivel === "verde" ? "bg-green-500" : score.nivel === "amarillo" ? "bg-amber-500" : "bg-red-500"
  const borderColor = score.nivel === "verde" ? "border-green-500/40 bg-green-500/10" : score.nivel === "amarillo" ? "border-amber-500/40 bg-amber-500/10" : "border-red-500/40 bg-red-500/10"
  const { t } = useLang()
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

function ModalComparacion({
  registros,
  onCerrar,
}: {
  registros: IntakeFormulario[]
  onCerrar: () => void
}) {
  const { t: tComp } = useLang()

  type Fila = {
    registro: IntakeFormulario
    resultado: ResultadoScore
    sortKey: number
  }

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-xl font-bold">{tComp.mensajes.comparacion.titulo}</h2>
            <p className="text-sm text-muted-foreground">
              {tComp.mensajes.comparacion.inmueble} <span className="font-medium">{inmueble}</span>
              {canon != null && <> — {tComp.mensajes.comparacion.canon} <span className="font-medium">{fmtCurrency(canon)}</span></>}
            </p>
          </div>
          <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground text-2xl leading-none" aria-label="Cerrar">×</button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{tComp.mensajes.comparacion.ordenados}</p>

        {/* Tabla ranking */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium w-8">#</th>
                <th className="text-left p-2 font-medium">{tComp.mensajes.columnas.nombre}</th>
                <th className="text-right p-2 font-medium">{tComp.mensajes.calificacion.capacidadPago}<br /><span className="font-normal text-muted-foreground text-xs">/50</span></th>
                <th className="text-right p-2 font-medium">{tComp.mensajes.calificacion.estabilidadLaboral}<br /><span className="font-normal text-muted-foreground text-xs">/20</span></th>
                <th className="text-right p-2 font-medium">{tComp.mensajes.calificacion.composicionHogar}<br /><span className="font-normal text-muted-foreground text-xs">/15</span></th>
                <th className="text-right p-2 font-medium">{tComp.mensajes.calificacion.mascotas}<br /><span className="font-normal text-muted-foreground text-xs">/15</span></th>
                <th className="text-right p-2 font-medium">Total<br /><span className="font-normal text-muted-foreground text-xs">/100</span></th>
                <th className="text-left p-2 font-medium">{tComp.mensajes.calificacion.titulo}</th>
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
                      <td colSpan={5} className="p-2 text-center text-muted-foreground text-xs">{tComp.mensajes.comparacion.sinPropiedad}</td>
                      <td className="p-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{tComp.mensajes.comparacion.sinDatos}</span>
                      </td>
                    </tr>
                  )
                }

                if (resultado.excluido) {
                  return (
                    <tr key={r.id} className={rowClass}>
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-medium">{r.nombre ?? "—"}</td>
                      <td colSpan={5} className="p-2 text-xs text-red-600 dark:text-red-400 truncate max-w-[200px]" title={resultado.filtro.motivo}>
                        {resultado.filtro.motivo}
                      </td>
                      <td className="p-2">
                        <span className="rounded-full bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-0.5 text-xs font-medium">{tComp.mensajes.comparacion.excluido}</span>
                      </td>
                    </tr>
                  )
                }

                const { score } = resultado
                const colorScore =
                  score.nivel === "verde" ? "text-green-600 dark:text-green-400 font-bold"
                  : score.nivel === "amarillo" ? "text-amber-600 dark:text-amber-400 font-bold"
                  : "text-red-600 dark:text-red-400 font-bold"

                const badgeClass =
                  score.nivel === "verde" ? "bg-green-500/15 text-green-700 dark:text-green-400"
                  : score.nivel === "amarillo" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-red-500/15 text-red-700 dark:text-red-400"

                return (
                  <tr key={r.id} className={rowClass}>
                    <td className="p-2 font-bold text-muted-foreground">
                      {esGanador ? <span className="text-green-600 dark:text-green-400">1</span> : idx + 1}
                    </td>
                    <td className="p-2 font-medium">
                      {r.nombre ?? "—"}
                      {esGanador && (
                        <span className="ml-2 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 text-xs">{tComp.mensajes.comparacion.mejor}</span>
                      )}
                    </td>
                    <td className={`p-2 text-right ${colorScore}`}>{score.capacidadPago.puntos}</td>
                    <td className={`p-2 text-right ${colorScore}`}>{score.estabilidadLaboral.puntos}</td>
                    <td className={`p-2 text-right ${colorScore}`}>{score.composicionHogar.puntos}</td>
                    <td className={`p-2 text-right ${colorScore}`}>{score.mascotas.puntos}</td>
                    <td className={`p-2 text-right text-lg ${colorScore}`}>{score.total}</td>
                    <td className="p-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{score.etiqueta}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
          {tComp.mensajes.comparacion.modeloBase}
        </div>
      </div>
    </div>
  )
}

// ── Tabla de intake reutilizable ───────────────────────────────────────────

function TablaIntake({
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
  role: UserRole | null
}) {
  const { t: tTbl } = useLang()
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

  const canCompare = role === "admin" || role === "propietario"

  return (
    <>
      {canCompare && algunoSeleccionado && (
        <div className="flex items-center justify-between mb-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {seleccionados.size} {seleccionados.size !== 1 ? tTbl.mensajes.seleccionadosPlural : tTbl.mensajes.seleccionados}
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
              {tTbl.mensajes.comparar}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {canCompare && (
                <th className="p-2 w-8">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={toggleTodos}
                    className="rounded"
                    title="Seleccionar todos"
                  />
                </th>
              )}
              <th className="text-left p-2 font-medium">Nombre</th>
              <th className="text-left p-2 font-medium">Email</th>
              <th className="text-left p-2 font-medium">Ingresos</th>
              <th className="text-left p-2 font-medium">Personas</th>
              <th className="text-left p-2 font-medium">Mascotas</th>
              <th className="text-left p-2 font-medium">Fecha (Bogotá)</th>
              <th className="text-left p-2 font-medium">{tTbl.mensajes.columnas.acciones}</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => {
              // Calcular ingresos totales sumando ambos salarios
              const salarioPrincipal = r.salario_principal ?? r.salario ?? 0
              const salarioSecundario = r.salario_secundario ?? r.salario_2 ?? 0
              const ingresosTotales = salarioPrincipal + salarioSecundario
              // Obtener personas y mascotas con los campos correctos
              const personas = r.adultos_habitantes ?? r.personas ?? 0
              const mascotas = r.mascotas_cantidad ?? r.mascotas ?? 0

              return (
                <tr
                  key={r.id}
                  className={`border-b transition-colors ${
                    canCompare && seleccionados.has(r.id) ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  {canCompare && (
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(r.id)}
                        onChange={() => onToggle(r.id)}
                        className="rounded"
                      />
                    </td>
                  )}
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
                      {tTbl.mensajes.verDetalle}
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

// ── Página principal ───────────────────────────────────────────────────────

export default function MensajesPage() {
  const { t } = useLang()
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<SolicitudVisitaConPropiedad[]>([])
  const [intakeRegistros, setIntakeRegistros] = useState<IntakeFormulario[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)
  const [tab, setTab] = useState<string>("pendiente")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [intakeSeleccionado, setIntakeSeleccionado] = useState<IntakeFormulario | null>(null)
  const [subTabIntake, setSubTabIntake] = useState<"pendientes" | "gestionados">("pendientes")
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mostrarComparacion, setMostrarComparacion] = useState(false)
  const [pasando, setPasando] = useState(false)
  const [pasadoOk, setPasadoOk] = useState<string | null>(null)
  const [pasadoError, setPasadoError] = useState<string | null>(null)
  // Para propietarios: sus propiedades y la seleccionada para filtrar
  const [propietarioPropiedades, setPropietarioPropiedades] = useState<Array<{ id: string; direccion?: string; ciudad?: string }>>([])
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<string | "all">("all")

  const fetchSolicitudes = useCallback(async () => {
    const res = await fetch("/api/solicitudes-visita")
    if (res.status === 403 || res.status === 401) { setSolicitudes([]); return }
    if (!res.ok) return
    const data = await res.json()
    setSolicitudes(Array.isArray(data) ? data : [])
  }, [])

  const fetchIntake = useCallback(async () => {
    const res = await fetch("/api/intake")
    if (res.status === 403 || res.status === 401) { setIntakeRegistros([]); return }
    if (!res.ok) return
    const data = await res.json()
    setIntakeRegistros(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { role?: UserRole } | null) => {
        const r = data?.role ?? null
        setRole(r)
        if (r === "inquilino") { router.replace("/inquilino/dashboard"); return }
      })
      .catch(() => setRole(null))
  }, [router])

  useEffect(() => {
    if (role === "admin" || role === "propietario") {
      const loads: Promise<void>[] = [fetchSolicitudes()]
      if (role === "admin" || role === "propietario") loads.push(fetchIntake())
      Promise.all(loads).finally(() => setLoading(false))
    } else if (role === "inquilino") {
      setLoading(false)
    }
  }, [role, fetchSolicitudes, fetchIntake])

  // Limpiar selección al cambiar de sub-tab
  useEffect(() => { setSeleccionados(new Set()) }, [subTabIntake])

  // Cargar propiedades del propietario
  useEffect(() => {
    if (role === "propietario") {
      fetch("/api/propietario/propiedades")
        .then((res) => (res.ok ? res.json() : []))
        .then((data: Array<{ id: string; direccion?: string; ciudad?: string }>) => {
          setPropietarioPropiedades(Array.isArray(data) ? data : [])
        })
        .catch(() => setPropietarioPropiedades([]))
    }
  }, [role])

  // Limpiar selección al cambiar propiedad seleccionada
  useEffect(() => { setSeleccionados(new Set()) }, [propiedadSeleccionada])

  const handleAbrirDetalle = useCallback(async (registro: IntakeFormulario) => {
    setIntakeSeleccionado(registro)
    setPasando(false)
    setPasadoOk(null)
    setPasadoError(null)

    // Marcar como gestionado si aún no lo está
    if (!registro.gestionado) {
      try {
        await fetch(`/api/intake/${registro.id}`, { method: "PATCH" })
        // Actualizar estado local inmediatamente
        setIntakeRegistros((prev) =>
          prev.map((r) => (r.id === registro.id ? { ...r, gestionado: true } : r))
        )
      } catch (error) {
        console.error("[handleAbrirDetalle] Error marcando como gestionado:", error)
      }
    }
  }, [])

  const handleToggleSeleccion = useCallback((id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleChangeStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/solicitudes-visita/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) await fetchSolicitudes()
    } finally {
      setUpdatingId(null)
    }
  }

  // Lógica de validación para comparación
  const { registrosParaComparar, puedeComparar, motivoInvalido } = useMemo(() => {
    const lista = intakeRegistros.filter((r) => seleccionados.has(r.id))
    if (lista.length < 2) {
      return { registrosParaComparar: lista, puedeComparar: false, motivoInvalido: t.mensajes.comparacion.sinPropiedad }
    }
    const ids = [...new Set(lista.map((r) => r.propiedad_id ?? "__sin__"))]
    if (ids.length > 1) {
      return { registrosParaComparar: lista, puedeComparar: false, motivoInvalido: t.mensajes.comparacion.sinPropiedad }
    }
    if (ids[0] === "__sin__") {
      return { registrosParaComparar: lista, puedeComparar: false, motivoInvalido: t.mensajes.comparacion.sinPropiedad }
    }
    return { registrosParaComparar: lista, puedeComparar: true, motivoInvalido: "" }
  }, [seleccionados, intakeRegistros, t])

  // Filtrar registros por propiedad seleccionada (solo para propietarios)
  const intakeRegistrosFiltrados = useMemo(() => {
    if (role === "propietario" && propiedadSeleccionada !== "all") {
      return intakeRegistros.filter((r) => r.propiedad_id === propiedadSeleccionada)
    }
    return intakeRegistros
  }, [intakeRegistros, role, propiedadSeleccionada])

  const filtered = solicitudes.filter((s) => s.status === tab)

  const refPropiedad = (s: SolicitudVisitaConPropiedad) => {
    const raw = s.propiedades
    const p = raw ? (Array.isArray(raw) ? raw[0] : raw) : null
    if (!p || typeof p !== "object") return s.propiedad_id
    const d = (p as { direccion?: string; ciudad?: string }).direccion
    const c = (p as { direccion?: string; ciudad?: string }).ciudad
    return [d, c].filter(Boolean).join(", ") || s.propiedad_id
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Bogota",
      })
    } catch { return dateStr }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—"
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
  }

  if (role === "inquilino") {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t.mensajes.sinAcceso}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.mensajes.titulo}</h1>
        <p className="text-muted-foreground">
          {t.mensajes.descripcion}
        </p>
      </div>

      {/* ── Modal comparación ── */}
      {(role === "admin" || role === "propietario") && mostrarComparacion && puedeComparar && (
        <ModalComparacion
          registros={registrosParaComparar}
          onCerrar={() => setMostrarComparacion(false)}
        />
      )}

      {/* ── Modal detalle de intake ── */}
      {intakeSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIntakeSeleccionado(null)}
        >
          <div
            className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{intakeSeleccionado.nombre ?? t.comun.sinDatos}</h2>
                <p className="text-sm text-muted-foreground">{t.mensajes.detalle.recibido} {formatDate(intakeSeleccionado.created_at)}</p>
                {(intakeSeleccionado.propiedad_id || intakeSeleccionado.id_inmueble) && (
                  <p className="text-xs text-muted-foreground">
                    {t.mensajes.comparacion.inmueble} {intakeSeleccionado.propiedad_id ?? intakeSeleccionado.id_inmueble}
                    {intakeSeleccionado.valor_arriendo ? ` — ${t.mensajes.comparacion.canon} ${formatCurrency(intakeSeleccionado.valor_arriendo)}` : ""}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIntakeSeleccionado(null)}
                className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">{t.mensajes.detalle.contacto}</p>
                <p><span className="font-medium">{t.mensajes.detalle.email}</span> {intakeSeleccionado.email ?? "—"}</p>
                <p><span className="font-medium">{t.mensajes.detalle.telefono}</span> {intakeSeleccionado.telefono ?? "—"}</p>
                <p><span className="font-medium">{t.mensajes.detalle.cedula}</span> {intakeSeleccionado.cedula ?? "—"}</p>
                <p><span className="font-medium">{t.mensajes.detalle.fechaExpCedula}</span> {intakeSeleccionado.cedula_ciudad_expedicion ?? intakeSeleccionado.fecha_expedicion_cedula ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">{t.mensajes.detalle.infoFinanciera}</p>
                <p><span className="font-medium">{t.mensajes.detalle.ingresos}</span> {formatCurrency(intakeSeleccionado.ingresos)}</p>
                <p><span className="font-medium">{t.mensajes.detalle.salarioPrincipal}</span> {formatCurrency(intakeSeleccionado.salario_principal ?? intakeSeleccionado.salario)}</p>
                <p><span className="font-medium">{t.mensajes.detalle.salarioSecundario}</span> {formatCurrency(intakeSeleccionado.salario_secundario ?? intakeSeleccionado.salario_2)}</p>
                <p><span className="font-medium">{t.mensajes.detalle.empresa}</span> {intakeSeleccionado.empresa_principal ?? intakeSeleccionado.empresa_arrendatario ?? intakeSeleccionado.empresas ?? "—"}</p>
                <p><span className="font-medium">{t.mensajes.detalle.antiguedad}</span> {intakeSeleccionado.tiempo_servicio_principal_meses ?? intakeSeleccionado.antiguedad_meses ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">{t.mensajes.detalle.grupoFamiliar}</p>
                <p><span className="font-medium">{t.mensajes.detalle.personasTotales}</span> {intakeSeleccionado.adultos_habitantes ?? intakeSeleccionado.personas ?? "—"}</p>
                <p><span className="font-medium">{t.mensajes.detalle.personasTrabajan}</span> {intakeSeleccionado.personas_trabajan ?? "—"}</p>
                <p><span className="font-medium">{t.mensajes.detalle.ninos}</span> {intakeSeleccionado.ninos_habitantes ?? intakeSeleccionado.ninos ?? "—"}</p>
                <p><span className="font-medium">{t.mensajes.detalle.mascotasLabel}</span> {intakeSeleccionado.mascotas_cantidad ?? intakeSeleccionado.mascotas ?? "—"}</p>
                <p><span className="font-medium">{t.mensajes.detalle.negocio}</span> {intakeSeleccionado.negocio ?? "—"}</p>
              </div>
              {(intakeSeleccionado.coarrendatario_nombre || intakeSeleccionado.nombre_coarrendatario || intakeSeleccionado.coarrendatario_cedula || intakeSeleccionado.cedula_coarrendatario) && (
                <div className="space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">{t.mensajes.detalle.coarrendatario}</p>
                  <p><span className="font-medium">{t.mensajes.columnas.nombre}:</span> {intakeSeleccionado.coarrendatario_nombre ?? intakeSeleccionado.nombre_coarrendatario ?? "—"}</p>
                  <p><span className="font-medium">{t.mensajes.detalle.cedula}</span> {intakeSeleccionado.coarrendatario_cedula ?? intakeSeleccionado.cedula_coarrendatario ?? "—"}</p>
                  <p><span className="font-medium">{t.mensajes.detalle.fechaExpCedula}</span> {intakeSeleccionado.coarrendatario_cedula_expedicion ?? intakeSeleccionado.fecha_expedicion_cedula_coarrendatario ?? "—"}</p>
                  <p><span className="font-medium">{t.mensajes.detalle.telefono}</span> {intakeSeleccionado.coarrendatario_telefono ?? intakeSeleccionado.telefono_coarrendatario ?? "—"}</p>
                  <p><span className="font-medium">Empresa:</span> {intakeSeleccionado.empresa_secundaria ?? intakeSeleccionado.empresa_coarrendatario ?? "—"}</p>
                  <p><span className="font-medium">Antigüedad (meses):</span> {intakeSeleccionado.tiempo_servicio_secundario_meses ?? intakeSeleccionado.antiguedad_meses_2 ?? "—"}</p>
                  <p><span className="font-medium">Salario:</span> {formatCurrency(intakeSeleccionado.salario_secundario ?? intakeSeleccionado.salario_2)}</p>
                </div>
              )}

              {/* Mostrar datos adicionales del formulario Google Forms si existen */}
              {intakeSeleccionado.data && Object.keys(intakeSeleccionado.data).length > 0 && (
                <div className="space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">{t.mensajes.detalle.datosAdicionales}</p>
                  {(() => {
                    const dataObj = intakeSeleccionado.data as Record<string, any>
                    const datasToShow: [string, any][] = []
                    
                    // Mapear campos conocidos del formulario Google Forms
                    const fieldsMap: Record<string, string> = {
                      'salario': 'Salario Arrendatario',
                      'numero_de_ninos': 'Número de Niños',
                      'numero_de_macotas': 'Número de Mascotas',
                      'cedula_arrendatario': 'Cédula Arrendatario',
                      'telefono_de_contacto': 'Teléfono de Contacto',
                      'cedula_coarrendatario': 'Cédula Co-arrendatario',
                      'nombre_coarrendatario': 'Nombre Co-arrendatario',
                      'personas_que_trabajan': 'Personas que Trabajan',
                      'numero_de_personas_adultas': 'Número de Personas Adultas',
                      'ingresos_mensuales_grupales': 'Ingresos Mensuales Grupales',
                      'tiempo_de_antiguedad_en_meses': 'Antigüedad (meses)',
                      'la_casa_la_quieren_para_negocio': 'Uso para Negocio',
                      'nombre_completo_de_arrendatario': 'Nombre Completo Arrendatario',
                      'telefono_de_contacto_arrendatario': 'Teléfono Arrendatario',
                      'empresa_donde_labora_arrenadatario': 'Empresa Arrendatario',
                      'empresa_donde_labora_coarrenadatario': 'Empresa Co-arrendatario',
                      'fecha_de_expedicion_cedula_arrendatario': 'Fecha Expedición Cédula Arrendatario',
                      'fecha_de_expedicion_cedula_coarrendatario': 'Fecha Expedición Cédula Co-arrendatario',
                    }
                    
                    for (const [key, value] of Object.entries(dataObj)) {
                      if (key.length < 200 && typeof value === 'string' && value.length < 200) {
                        const label = fieldsMap[key] || key.replace(/_/g, ' ')
                        datasToShow.push([label, value])
                      }
                    }
                    
                    if (datasToShow.length === 0) {
                      return <p className="text-xs text-muted-foreground">No hay datos adicionales</p>
                    }
                    
                    return (
                      <div className="space-y-1.5">
                        {datasToShow.map(([label, value]) => (
                          <p key={label} className="text-xs">
                            <span className="font-medium">{label}:</span> {value}
                          </p>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <SeccionCalificacion registro={intakeSeleccionado} />

            <div className="mt-4 pt-4 border-t space-y-3">
              {(role === "admin" || role === "propietario") && pasadoOk && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
                  {t.mensajes.creadoOk} <strong>{pasadoOk}</strong>
                </div>
              )}
              {(role === "admin" || role === "propietario") && pasadoError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
                  {pasadoError}
                </div>
              )}
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {t.mensajes.detalle.autorizacion} {intakeSeleccionado.autorizacion ? intakeSeleccionado.autorizacion.slice(0, 60) + "…" : "—"}
                </p>
                {(role === "admin" || role === "propietario") && (
                  <button
                    disabled={pasando || !!pasadoOk}
                    onClick={async () => {
                      setPasando(true)
                      setPasadoOk(null)
                      setPasadoError(null)
                      try {
                        const res = await fetch("/api/mensajes/pasar-arrendatario", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ intakeId: intakeSeleccionado.id }),
                        })
                        const json = await res.json()
                        if (!res.ok) {
                          setPasadoError(json.error ?? t.mensajes.errorProceso)
                        } else {
                          setPasadoOk(json.email ?? "—")
                          setIntakeRegistros((prev) =>
                            prev.map((r) =>
                              r.id === intakeSeleccionado.id ? { ...r, gestionado: true } : r
                            )
                          )
                        }
                      } catch {
                        setPasadoError(t.mensajes.errorConexion)
                      } finally {
                        setPasando(false)
                      }
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="solicitudes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="solicitudes">{t.mensajes.tabSolicitudes}</TabsTrigger>
          <TabsTrigger value="posibles-arrendatarios">
            {t.mensajes.tabArrendatarios}
            {intakeRegistrosFiltrados.filter((r) => !r.gestionado).length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
                {intakeRegistrosFiltrados.filter((r) => !r.gestionado).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Solicitudes de visita ── */}
        <TabsContent value="solicitudes">
          <Card>
            <CardHeader><CardTitle>{t.mensajes.tabSolicitudes}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">{t.comun.cargando}</p>
              ) : (
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="grid w-full grid-cols-3 max-w-md">
                    <TabsTrigger value="pendiente">
                      {t.mensajes.pendientes} ({solicitudes.filter((s) => s.status === "pendiente").length})
                    </TabsTrigger>
                    <TabsTrigger value="contestado">
                      {t.mensajes.estados.contestado} ({solicitudes.filter((s) => s.status === "contestado").length})
                    </TabsTrigger>
                    <TabsTrigger value="esperando">
                      {t.mensajes.estados.esperando} ({solicitudes.filter((s) => s.status === "esperando").length})
                    </TabsTrigger>
                  </TabsList>
                  {STATUS_VALUES.map((value) => (
                    <TabsContent key={value} value={value} className="mt-4">
                      {filtered.length === 0 ? (
                        <p className="text-muted-foreground py-8">{t.mensajes.noHayMensajes}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2 font-medium">{t.mensajes.columnas.nombre}</th>
                                <th className="text-left p-2 font-medium">{t.mensajes.columnas.celular}</th>
                                <th className="text-left p-2 font-medium">{t.mensajes.columnas.email}</th>
                                <th className="text-left p-2 font-medium">{t.mensajes.columnas.propiedad}</th>
                                <th className="text-left p-2 font-medium">{t.mensajes.columnas.nota}</th>
                                <th className="text-left p-2 font-medium">{t.mensajes.columnas.fecha}</th>
                                <th className="text-left p-2 font-medium">{t.mensajes.columnas.estado}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((s) => (
                                <tr key={s.id} className="border-b">
                                  <td className="p-2">{s.nombre_completo}</td>
                                  <td className="p-2">{s.celular}</td>
                                  <td className="p-2">{s.email}</td>
                                  <td className="p-2 max-w-[200px] truncate" title={refPropiedad(s)}>{refPropiedad(s)}</td>
                                  <td className="p-2 max-w-[180px] truncate" title={s.nota ?? ""}>{s.nota || "—"}</td>
                                  <td className="p-2">{formatDate(s.created_at)}</td>
                                  <td className="p-2">
                                    <select
                                      value={s.status}
                                      onChange={(e) => handleChangeStatus(s.id, e.target.value)}
                                      disabled={updatingId === s.id}
                                      className="rounded border bg-background px-2 py-1 text-sm"
                                    >
                                      {STATUS_VALUES.map((val) => (
                                        <option key={val} value={val}>{t.mensajes.estados[val as keyof typeof t.mensajes.estados]}</option>
                                      ))}
                                    </select>
                                    {updatingId === s.id && (
                                      <span className="ml-1 text-xs text-muted-foreground">{t.mensajes.guardando}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Posibles Arrendatarios (intake) ── */}
        <TabsContent value="posibles-arrendatarios">
          <Card>
            <CardHeader><CardTitle>{t.mensajes.tabArrendatarios}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">{t.comun.cargando}</p>
              ) : role !== "admin" && role !== "propietario" ? (
                <p className="text-muted-foreground py-8">{t.mensajes.sinAcceso}</p>
              ) : (
                <>
                  {/* Selector de propiedad para propietarios */}
                  {role === "propietario" && propietarioPropiedades.length > 0 && (
                    <div className="mb-4 flex items-center gap-2">
                      <label className="text-sm font-medium text-muted-foreground">Filtrar por propiedad:</label>
                      <select
                        value={propiedadSeleccionada}
                        onChange={(e) => setPropiedadSeleccionada(e.target.value)}
                        className="rounded border bg-background px-3 py-1.5 text-sm"
                      >
                        <option value="all">Todas mis propiedades</option>
                        {propietarioPropiedades.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.direccion ? `${p.direccion}${p.ciudad ? `, ${p.ciudad}` : ''}` : p.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSubTabIntake("pendientes")}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          subTabIntake === "pendientes"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.mensajes.pendientes}
                        {intakeRegistrosFiltrados.filter((r) => !r.gestionado).length > 0 && (
                          <span className="ml-1.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-xs font-medium text-white">
                            {intakeRegistrosFiltrados.filter((r) => !r.gestionado).length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setSubTabIntake("gestionados")}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          subTabIntake === "gestionados"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.mensajes.gestionados}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({intakeRegistrosFiltrados.filter((r) => r.gestionado).length})
                        </span>
                      </button>
                    </div>

                    {(role === "admin" || role === "propietario") && (
                      <button
                        onClick={() => puedeComparar && setMostrarComparacion(true)}
                        disabled={!puedeComparar}
                        title={!puedeComparar ? motivoInvalido : t.mensajes.comparar}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                          puedeComparar
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        }`}
                      >
                        {t.mensajes.comparar}
                        {seleccionados.size >= 2 && (
                          <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                            {seleccionados.size}
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Tabla filtrada por sub-tab */}
                  {(() => {
                    const lista = intakeRegistrosFiltrados
                      .filter((r) => (subTabIntake === "pendientes" ? !r.gestionado : r.gestionado))
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

                    if (lista.length === 0) {
                      return (
                        <p className="text-muted-foreground py-8">
                          {subTabIntake === "pendientes"
                            ? t.mensajes.noHaySolicitudes
                            : t.mensajes.noHayGestionados}
                        </p>
                      )
                    }
                    return (
                      <TablaIntake
                        lista={lista}
                        seleccionados={seleccionados}
                        onToggle={handleToggleSeleccion}
                        onVerDetalle={handleAbrirDetalle}
                        formatDate={formatDate}
                        formatCurrency={formatCurrency}
                        puedeComparar={puedeComparar}
                        motivoInvalido={motivoInvalido}
                        onComparar={() => setMostrarComparacion(true)}
                        role={role}
                      />
                    )
                  })()}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
