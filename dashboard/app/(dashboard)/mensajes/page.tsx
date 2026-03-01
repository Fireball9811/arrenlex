"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SolicitudVisitaConPropiedad, IntakeFormulario } from "@/lib/types/database"
import type { UserRole } from "@/lib/auth/role"

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "contestado", label: "Contestado" },
  { value: "esperando", label: "Esperando" },
] as const

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

  const ingresoTotal = (r.salario ?? 0) + (r.salario_2 ?? 0)
  const fmt = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v)

  const autorizacion = (r.autorizacion ?? "").toLowerCase()
  if (!autorizacion || (!autorizacion.includes("sí") && !autorizacion.includes("si"))) {
    return { excluido: true, filtro: { aplica: true, motivo: "No autorizó tratamiento de datos personales" } }
  }
  if (r.negocio && r.negocio.trim() !== "" && r.negocio.trim().toLowerCase() !== "no") {
    return { excluido: true, filtro: { aplica: true, motivo: `Uso no residencial indicado: "${r.negocio}"` } }
  }
  if (canon > 0 && ingresoTotal < canon * 1.5) {
    return {
      excluido: true,
      filtro: { aplica: true, motivo: `Ingresos insuficientes: ${fmt(ingresoTotal)} < 1.5x canon (${fmt(canon * 1.5)})` },
    }
  }

  const ratio = canon > 0 ? ingresoTotal / canon : 0
  let ptsPago = 0; let descPago = ""
  if (ratio >= 3) { ptsPago = 50; descPago = `${ratio.toFixed(1)}x canon — Excelente` }
  else if (ratio >= 2) { ptsPago = 38; descPago = `${ratio.toFixed(1)}x canon — Aceptable` }
  else { ptsPago = 25; descPago = `${ratio.toFixed(1)}x canon — Riesgo medio` }

  const meses = r.antiguedad_meses ?? 0
  let ptsLaboral = 0; let descLaboral = ""
  if (meses >= 24) { ptsLaboral = 20; descLaboral = `${meses} meses — Muy estable` }
  else if (meses >= 12) { ptsLaboral = 13; descLaboral = `${meses} meses — Estable` }
  else { ptsLaboral = 6; descLaboral = `${meses} meses — Riesgo` }

  const personas = r.personas ?? 1
  let ptsHogar = 0; let descHogar = ""
  if (personas <= 3) { ptsHogar = 15; descHogar = `${personas} personas — Ideal` }
  else if (personas === 4) { ptsHogar = 10; descHogar = `${personas} personas — A evaluar` }
  else { ptsHogar = 5; descHogar = `${personas} personas — Riesgo` }

  const mascotas = r.mascotas ?? 0
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

  if (resultado.sinCanon) {
    return (
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Calificación ARRENLEX</p>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Sin propiedad vinculada — no se puede calcular capacidad de pago. Verifica que el formulario incluya el código del inmueble.
        </div>
      </div>
    )
  }
  if (resultado.excluido) {
    return (
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Calificación ARRENLEX</p>
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">RECHAZADO — Filtro excluyente</p>
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
    { label: "Capacidad de pago", max: 50, ...score.capacidadPago },
    { label: "Estabilidad laboral", max: 20, ...score.estabilidadLaboral },
    { label: "Composición del hogar", max: 15, ...score.composicionHogar },
    { label: "Mascotas", max: 15, ...score.mascotas },
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

  const inmueble = registros[0]?.id_inmueble ?? "—"
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
            <h2 className="text-xl font-bold">Comparación de candidatos</h2>
            <p className="text-sm text-muted-foreground">
              Inmueble: <span className="font-medium">{inmueble}</span>
              {canon != null && <> — Canon: <span className="font-medium">{fmtCurrency(canon)}</span></>}
            </p>
          </div>
          <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground text-2xl leading-none" aria-label="Cerrar">×</button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Ordenados de mayor a menor calificación. El candidato mejor posicionado aparece primero.</p>

        {/* Tabla ranking */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium w-8">#</th>
                <th className="text-left p-2 font-medium">Nombre</th>
                <th className="text-right p-2 font-medium">Cap. Pago<br /><span className="font-normal text-muted-foreground text-xs">/50</span></th>
                <th className="text-right p-2 font-medium">Estabilidad<br /><span className="font-normal text-muted-foreground text-xs">/20</span></th>
                <th className="text-right p-2 font-medium">Hogar<br /><span className="font-normal text-muted-foreground text-xs">/15</span></th>
                <th className="text-right p-2 font-medium">Mascotas<br /><span className="font-normal text-muted-foreground text-xs">/15</span></th>
                <th className="text-right p-2 font-medium">Total<br /><span className="font-normal text-muted-foreground text-xs">/100</span></th>
                <th className="text-left p-2 font-medium">Resultado</th>
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
                      <td colSpan={5} className="p-2 text-center text-muted-foreground text-xs">Sin propiedad vinculada</td>
                      <td className="p-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Sin datos</span>
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
                        <span className="rounded-full bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-0.5 text-xs font-medium">Excluido</span>
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
                        <span className="ml-2 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 text-xs">Mejor</span>
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
          Comparación basada en el modelo ARRENLEX: Capacidad de pago (50%) + Estabilidad laboral (20%) + Composición del hogar (15%) + Mascotas (15%)
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
}) {
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
      {/* Barra de acciones cuando hay selección */}
      {algunoSeleccionado && (
        <div className="flex items-center justify-between mb-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {seleccionados.size} candidato{seleccionados.size !== 1 ? "s" : ""} seleccionado{seleccionados.size !== 1 ? "s" : ""}
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
              Comparación
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 w-8">
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  onChange={toggleTodos}
                  className="rounded"
                  title="Seleccionar todos"
                />
              </th>
              <th className="text-left p-2 font-medium">Nombre</th>
              <th className="text-left p-2 font-medium">Email</th>
              <th className="text-left p-2 font-medium">Teléfono</th>
              <th className="text-left p-2 font-medium">Personas</th>
              <th className="text-left p-2 font-medium">Ingresos</th>
              <th className="text-left p-2 font-medium">Fecha</th>
              <th className="text-left p-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr
                key={r.id}
                className={`border-b transition-colors ${
                  seleccionados.has(r.id) ? "bg-primary/5" : "hover:bg-muted/30"
                }`}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(r.id)}
                    onChange={() => onToggle(r.id)}
                    className="rounded"
                  />
                </td>
                <td className="p-2 font-medium">{r.nombre ?? "—"}</td>
                <td className="p-2">{r.email ?? "—"}</td>
                <td className="p-2">{r.telefono ?? "—"}</td>
                <td className="p-2">{r.personas ?? "—"}</td>
                <td className="p-2">{r.ingresos != null ? formatCurrency(r.ingresos) : "—"}</td>
                <td className="p-2">{formatDate(r.created_at)}</td>
                <td className="p-2">
                  <button
                    onClick={() => onVerDetalle(r)}
                    className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

export default function MensajesPage() {
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
        if (r === "inquilino") { router.replace("/dashboard"); return }
      })
      .catch(() => setRole(null))
  }, [router])

  useEffect(() => {
    if (role === "admin" || role === "propietario") {
      const loads: Promise<void>[] = [fetchSolicitudes()]
      if (role === "admin") loads.push(fetchIntake())
      Promise.all(loads).finally(() => setLoading(false))
    } else if (role === "inquilino") {
      setLoading(false)
    }
  }, [role, fetchSolicitudes, fetchIntake])

  // Limpiar selección al cambiar de sub-tab
  useEffect(() => { setSeleccionados(new Set()) }, [subTabIntake])

  const handleAbrirDetalle = useCallback(async (registro: IntakeFormulario) => {
    setIntakeSeleccionado(registro)
    if (!registro.gestionado) {
      await fetch(`/api/intake/${registro.id}`, { method: "PATCH" })
      setIntakeRegistros((prev) =>
        prev.map((r) => (r.id === registro.id ? { ...r, gestionado: true } : r))
      )
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
      return { registrosParaComparar: lista, puedeComparar: false, motivoInvalido: "Selecciona al menos 2 candidatos" }
    }
    const ids = [...new Set(lista.map((r) => r.id_inmueble ?? "__sin__"))]
    if (ids.length > 1) {
      return { registrosParaComparar: lista, puedeComparar: false, motivoInvalido: "Los candidatos deben ser de la misma propiedad (mismo id_inmueble)" }
    }
    if (ids[0] === "__sin__") {
      return { registrosParaComparar: lista, puedeComparar: false, motivoInvalido: "Los candidatos no tienen propiedad vinculada" }
    }
    return { registrosParaComparar: lista, puedeComparar: true, motivoInvalido: "" }
  }, [seleccionados, intakeRegistros])

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
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
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
        <p className="text-muted-foreground">No tienes acceso a esta sección.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mensajes</h1>
        <p className="text-muted-foreground">
          Solicitudes de visita y posibles arrendatarios desde el formulario web.
        </p>
      </div>

      {/* ── Modal comparación ── */}
      {mostrarComparacion && puedeComparar && (
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
                <h2 className="text-xl font-bold">{intakeSeleccionado.nombre ?? "Sin nombre"}</h2>
                <p className="text-sm text-muted-foreground">Recibido: {formatDate(intakeSeleccionado.created_at)}</p>
                {intakeSeleccionado.id_inmueble && (
                  <p className="text-xs text-muted-foreground">
                    Inmueble: {intakeSeleccionado.id_inmueble}
                    {intakeSeleccionado.valor_arriendo ? ` — Canon: ${formatCurrency(intakeSeleccionado.valor_arriendo)}` : ""}
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
                <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">Contacto</p>
                <p><span className="font-medium">Email:</span> {intakeSeleccionado.email ?? "—"}</p>
                <p><span className="font-medium">Teléfono:</span> {intakeSeleccionado.telefono ?? "—"}</p>
                <p><span className="font-medium">Cédula:</span> {intakeSeleccionado.cedula ?? "—"}</p>
                <p><span className="font-medium">Fecha exp. cédula:</span> {intakeSeleccionado.fecha_expedicion_cedula ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">Información financiera</p>
                <p><span className="font-medium">Ingresos:</span> {formatCurrency(intakeSeleccionado.ingresos)}</p>
                <p><span className="font-medium">Salario principal:</span> {formatCurrency(intakeSeleccionado.salario)}</p>
                <p><span className="font-medium">Salario secundario:</span> {formatCurrency(intakeSeleccionado.salario_2)}</p>
                <p><span className="font-medium">Empresa:</span> {intakeSeleccionado.empresa_arrendatario ?? intakeSeleccionado.empresas ?? "—"}</p>
                <p><span className="font-medium">Antigüedad (meses):</span> {intakeSeleccionado.antiguedad_meses ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">Grupo familiar</p>
                <p><span className="font-medium">Personas totales:</span> {intakeSeleccionado.personas ?? "—"}</p>
                <p><span className="font-medium">Personas que trabajan:</span> {intakeSeleccionado.personas_trabajan ?? "—"}</p>
                <p><span className="font-medium">Niños:</span> {intakeSeleccionado.ninos ?? "—"}</p>
                <p><span className="font-medium">Mascotas:</span> {intakeSeleccionado.mascotas ?? "—"}</p>
                <p><span className="font-medium">Negocio:</span> {intakeSeleccionado.negocio ?? "—"}</p>
              </div>
              {(intakeSeleccionado.nombre_coarrendatario || intakeSeleccionado.cedula_coarrendatario) && (
                <div className="space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">Coarrendatario</p>
                  <p><span className="font-medium">Nombre:</span> {intakeSeleccionado.nombre_coarrendatario ?? "—"}</p>
                  <p><span className="font-medium">Cédula:</span> {intakeSeleccionado.cedula_coarrendatario ?? "—"}</p>
                  <p><span className="font-medium">Teléfono:</span> {intakeSeleccionado.telefono_coarrendatario ?? "—"}</p>
                  <p><span className="font-medium">Empresa:</span> {intakeSeleccionado.empresa_coarrendatario ?? "—"}</p>
                  <p><span className="font-medium">Antigüedad (meses):</span> {intakeSeleccionado.antiguedad_meses_2 ?? "—"}</p>
                  <p><span className="font-medium">Salario:</span> {formatCurrency(intakeSeleccionado.salario_2)}</p>
                </div>
              )}
            </div>

            <SeccionCalificacion registro={intakeSeleccionado} />

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Autorización: {intakeSeleccionado.autorizacion ? intakeSeleccionado.autorizacion.slice(0, 60) + "…" : "—"}
              </p>
              {/* TODO: implementar lógica para pasar datos al módulo de arrendatarios */}
              <button
                disabled
                className="rounded-lg bg-primary/40 px-4 py-2 text-sm font-medium text-primary-foreground cursor-not-allowed opacity-60"
                title="Próximamente"
              >
                Pasar a Arrendatarios
              </button>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="solicitudes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="solicitudes">Solicitudes de visita</TabsTrigger>
          <TabsTrigger value="posibles-arrendatarios">
            Posibles Arrendatarios
            {intakeRegistros.filter((r) => !r.gestionado).length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
                {intakeRegistros.filter((r) => !r.gestionado).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Solicitudes de visita ── */}
        <TabsContent value="solicitudes">
          <Card>
            <CardHeader><CardTitle>Solicitudes de visita</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Cargando…</p>
              ) : (
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="grid w-full grid-cols-3 max-w-md">
                    <TabsTrigger value="pendiente">
                      Pendientes ({solicitudes.filter((s) => s.status === "pendiente").length})
                    </TabsTrigger>
                    <TabsTrigger value="contestado">
                      Contestados ({solicitudes.filter((s) => s.status === "contestado").length})
                    </TabsTrigger>
                    <TabsTrigger value="esperando">
                      Esperando ({solicitudes.filter((s) => s.status === "esperando").length})
                    </TabsTrigger>
                  </TabsList>
                  {STATUS_OPTIONS.map(({ value }) => (
                    <TabsContent key={value} value={value} className="mt-4">
                      {filtered.length === 0 ? (
                        <p className="text-muted-foreground py-8">No hay mensajes en esta categoría.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2 font-medium">Nombre</th>
                                <th className="text-left p-2 font-medium">Celular</th>
                                <th className="text-left p-2 font-medium">Email</th>
                                <th className="text-left p-2 font-medium">Propiedad</th>
                                <th className="text-left p-2 font-medium">Nota</th>
                                <th className="text-left p-2 font-medium">Fecha</th>
                                <th className="text-left p-2 font-medium">Estado</th>
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
                                      {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                    {updatingId === s.id && (
                                      <span className="ml-1 text-xs text-muted-foreground">Guardando…</span>
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
            <CardHeader><CardTitle>Posibles Arrendatarios</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Cargando…</p>
              ) : role !== "admin" ? (
                <p className="text-muted-foreground py-8">Solo el administrador puede ver esta sección.</p>
              ) : (
                <>
                  {/* Sub-tabs: Pendientes / Gestionados */}
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
                        Pendientes
                        {intakeRegistros.filter((r) => !r.gestionado).length > 0 && (
                          <span className="ml-1.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-xs font-medium text-white">
                            {intakeRegistros.filter((r) => !r.gestionado).length}
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
                        Gestionados
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({intakeRegistros.filter((r) => r.gestionado).length})
                        </span>
                      </button>
                    </div>

                    {/* Botón Comparación — siempre visible a la derecha */}
                    <button
                      onClick={() => puedeComparar && setMostrarComparacion(true)}
                      disabled={!puedeComparar}
                      title={!puedeComparar ? motivoInvalido : "Comparar candidatos seleccionados"}
                      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                        puedeComparar
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                      }`}
                    >
                      Comparación
                      {seleccionados.size >= 2 && (
                        <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                          {seleccionados.size}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Tabla filtrada por sub-tab */}
                  {(() => {
                    const lista = intakeRegistros
                      .filter((r) => (subTabIntake === "pendientes" ? !r.gestionado : r.gestionado))
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

                    if (lista.length === 0) {
                      return (
                        <p className="text-muted-foreground py-8">
                          {subTabIntake === "pendientes"
                            ? "No hay solicitudes pendientes."
                            : "No hay solicitudes gestionadas aún."}
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
