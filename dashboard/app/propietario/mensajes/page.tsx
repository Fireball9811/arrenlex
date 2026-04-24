"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SolicitudVisitaConPropiedad, IntakeFormulario } from "@/lib/types/database"
import { useLang } from "@/lib/i18n/context"
import {
  ModalComparacion,
  ModalDetalleIntake,
  TablaIntake,
} from "@/components/mensajes/mensajes-helpers"

const STATUS_VALUES = ["pendiente", "contestado", "esperando"] as const

export default function PropietarioMensajesPage() {
  const { t } = useLang()
  const [solicitudes, setSolicitudes] = useState<SolicitudVisitaConPropiedad[]>([])
  const [intakeRegistros, setIntakeRegistros] = useState<IntakeFormulario[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>("pendiente")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [intakeSeleccionado, setIntakeSeleccionado] = useState<IntakeFormulario | null>(null)
  const [subTabIntake, setSubTabIntake] = useState<"pendientes" | "gestionados" | "no_aceptados" | "completados">("pendientes")
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mostrarComparacion, setMostrarComparacion] = useState(false)
  const [propiedades, setPropiedades] = useState<Array<{ id: string; direccion?: string; ciudad?: string }>>([])
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<string | "all">("all")
  const [busquedaNombre, setBusquedaNombre] = useState("")
  const [busquedaCelular, setBusquedaCelular] = useState("")

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
    Promise.all([fetchSolicitudes(), fetchIntake()]).finally(() => setLoading(false))
  }, [fetchSolicitudes, fetchIntake])

  useEffect(() => {
    fetch("/api/propietario/propiedades")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ id: string; direccion?: string; ciudad?: string }>) => {
        const lista = Array.isArray(data) ? data : []
        setPropiedades(lista)
        setPropiedadSeleccionada((prev) => {
          if (prev === "all") return prev
          return lista.some((p) => p.id === prev) ? prev : "all"
        })
      })
      .catch(() => setPropiedades([]))
  }, [])

  useEffect(() => { setSeleccionados(new Set()) }, [subTabIntake])
  useEffect(() => { setSeleccionados(new Set()) }, [propiedadSeleccionada])

  const handleAbrirDetalle = useCallback(async (registro: IntakeFormulario) => {
    setIntakeSeleccionado(registro)
    if (!registro.gestionado) {
      try {
        await fetch(`/api/intake/${registro.id}`, { method: "PATCH" })
        setIntakeRegistros((prev) =>
          prev.map((r) => (r.id === registro.id ? { ...r, gestionado: true } : r))
        )
      } catch {
        // continúa sin marcar
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

  const handlePasarArrendatario = useCallback(async (intakeId: string) => {
    try {
      const res = await fetch("/api/mensajes/pasar-arrendatario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeId }),
      })
      const json = await res.json()
      if (!res.ok) return { ok: false, error: json.error ?? t.mensajes.errorProceso }
      setIntakeRegistros((prev) => prev.map((r) => r.id === intakeId ? { ...r, gestionado: true } : r))
      return { ok: true, email: json.email ?? "—" }
    } catch {
      return { ok: false, error: t.mensajes.errorConexion }
    }
  }, [t])

  const patchIntake = useCallback(async (
    intakeId: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/intake/${intakeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: json.error ?? t.mensajes.errorProceso }
      return { ok: true }
    } catch {
      return { ok: false, error: t.mensajes.errorConexion }
    }
  }, [t])

  const handleDescartar = useCallback(async (intakeId: string, motivo: string) => {
    const result = await patchIntake(intakeId, { accion: "descartar", motivo })
    if (result.ok) {
      const nowIso = new Date().toISOString()
      setIntakeRegistros((prev) =>
        prev.map((r) =>
          r.id === intakeId
            ? { ...r, descartado: true, motivo_descarte: motivo, descartado_at: nowIso, gestionado: true }
            : r,
        ),
      )
    }
    return result
  }, [patchIntake])

  const handleEditarMotivo = useCallback(async (intakeId: string, motivo: string) => {
    const result = await patchIntake(intakeId, { accion: "editar_motivo", motivo })
    if (result.ok) {
      setIntakeRegistros((prev) =>
        prev.map((r) => (r.id === intakeId ? { ...r, motivo_descarte: motivo } : r)),
      )
    }
    return result
  }, [patchIntake])

  const handleReactivar = useCallback(async (intakeId: string) => {
    const result = await patchIntake(intakeId, { accion: "reactivar" })
    if (result.ok) {
      setIntakeRegistros((prev) =>
        prev.map((r) =>
          r.id === intakeId
            ? {
                ...r,
                descartado: false,
                motivo_descarte: null,
                descartado_at: null,
                gestionado: false,
                completado: false,
                completado_at: null,
              }
            : r,
        ),
      )
    }
    return result
  }, [patchIntake])

  const handleCompletar = useCallback(async (intakeId: string) => {
    const result = await patchIntake(intakeId, { accion: "completar" })
    if (result.ok) {
      const nowIso = new Date().toISOString()
      setIntakeRegistros((prev) =>
        prev.map((r) =>
          r.id === intakeId
            ? { ...r, completado: true, completado_at: nowIso, gestionado: true }
            : r,
        ),
      )
    }
    return result
  }, [patchIntake])

  const handleDescompletar = useCallback(async (intakeId: string) => {
    const result = await patchIntake(intakeId, { accion: "descompletar" })
    if (result.ok) {
      setIntakeRegistros((prev) =>
        prev.map((r) =>
          r.id === intakeId
            ? { ...r, completado: false, completado_at: null }
            : r,
        ),
      )
    }
    return result
  }, [patchIntake])

  const handleEliminarIntake = useCallback(async (intakeId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/intake/${intakeId}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: json.error ?? t.mensajes.errorProceso }
      setIntakeRegistros((prev) => prev.filter((r) => r.id !== intakeId))
      setSeleccionados((prev) => {
        if (!prev.has(intakeId)) return prev
        const next = new Set(prev)
        next.delete(intakeId)
        return next
      })
      setIntakeSeleccionado((prev) => (prev?.id === intakeId ? null : prev))
      return { ok: true }
    } catch {
      return { ok: false, error: t.mensajes.errorConexion }
    }
  }, [t])

  const { registrosParaComparar, puedeComparar, motivoInvalido } = useMemo(() => {
    const lista = intakeRegistros.filter((r) => seleccionados.has(r.id))
    if (lista.length < 2) return { registrosParaComparar: lista, puedeComparar: false, motivoInvalido: t.mensajes.comparacion.sinPropiedad }
    const ids = [...new Set(lista.map((r) => r.propiedad_id ?? "__sin__"))]
    if (ids.length > 1 || ids[0] === "__sin__") return { registrosParaComparar: lista, puedeComparar: false, motivoInvalido: t.mensajes.comparacion.sinPropiedad }
    return { registrosParaComparar: lista, puedeComparar: true, motivoInvalido: "" }
  }, [seleccionados, intakeRegistros, t])

  const intakeRegistrosFiltrados = useMemo(() => {
    if (propiedadSeleccionada !== "all") {
      return intakeRegistros.filter((r) => r.propiedad_id === propiedadSeleccionada)
    }
    return intakeRegistros
  }, [intakeRegistros, propiedadSeleccionada])

  const normalizarTexto = useCallback((s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
  , [])
  const normalizarTelefono = useCallback((s: string) =>
    s.replace(/[\s\-().+]/g, "")
  , [])

  const busquedaActiva = busquedaNombre.trim().length > 0 || busquedaCelular.trim().length > 0

  const intakeRegistrosBuscados = useMemo(() => {
    if (!busquedaActiva) return intakeRegistrosFiltrados
    const qNombre = normalizarTexto(busquedaNombre)
    const qTel = normalizarTelefono(busquedaCelular)
    return intakeRegistrosFiltrados.filter((r) => {
      const nombre = normalizarTexto(r.nombre ?? "")
      const tel = normalizarTelefono(r.telefono ?? "")
      const matchNombre = qNombre ? nombre.includes(qNombre) : true
      const matchTel = qTel ? tel.includes(qTel) : true
      return matchNombre && matchTel
    })
  }, [busquedaActiva, busquedaNombre, busquedaCelular, intakeRegistrosFiltrados, normalizarTexto, normalizarTelefono])

  const conteoPorSubtab = useMemo(() => {
    const base = busquedaActiva ? intakeRegistrosBuscados : intakeRegistrosFiltrados
    return {
      pendientes: base.filter((r) => !r.gestionado && !r.descartado && !r.completado).length,
      gestionados: base.filter((r) => r.gestionado && !r.descartado && !r.completado).length,
      no_aceptados: base.filter((r) => r.descartado === true).length,
      completados: base.filter((r) => r.completado === true).length,
    }
  }, [busquedaActiva, intakeRegistrosBuscados, intakeRegistrosFiltrados])

  useEffect(() => {
    if (!busquedaActiva) return
    if (conteoPorSubtab[subTabIntake] > 0) return
    const siguiente = (["pendientes", "gestionados", "no_aceptados", "completados"] as const).find(
      (tab) => conteoPorSubtab[tab] > 0,
    )
    if (siguiente) setSubTabIntake(siguiente)
  }, [busquedaActiva, conteoPorSubtab, subTabIntake])

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
    const s = dateStr.trim()
    if (!s) return "—"
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
    try {
      const d = new Date(s)
      if (isNaN(d.getTime())) return s
      return d.toLocaleDateString("es-CO", {
        day: "2-digit", month: "2-digit", year: "numeric",
        timeZone: "America/Bogota",
      })
    } catch { return s }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—"
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.mensajes.titulo}</h1>
        <p className="text-muted-foreground">{t.mensajes.descripcion}</p>
      </div>

      {mostrarComparacion && puedeComparar && (
        <ModalComparacion registros={registrosParaComparar} onCerrar={() => setMostrarComparacion(false)} />
      )}

      {intakeSeleccionado && (
        <ModalDetalleIntake
          registro={intakeRegistros.find((r) => r.id === intakeSeleccionado.id) ?? intakeSeleccionado}
          role="propietario"
          onCerrar={() => setIntakeSeleccionado(null)}
          onPasarArrendatario={handlePasarArrendatario}
          onDescartar={handleDescartar}
          onEditarMotivo={handleEditarMotivo}
          onReactivar={handleReactivar}
          onCompletar={handleCompletar}
          onDescompletar={handleDescompletar}
        />
      )}

      <Tabs defaultValue="solicitudes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="solicitudes">{t.mensajes.tabSolicitudes}</TabsTrigger>
          <TabsTrigger value="posibles-arrendatarios">
            {t.mensajes.tabArrendatarios}
            {intakeRegistrosFiltrados.filter((r) => !r.gestionado && !r.descartado && !r.completado).length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
                {intakeRegistrosFiltrados.filter((r) => !r.gestionado && !r.descartado && !r.completado).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="posibles-arrendatarios">
          <Card>
            <CardHeader><CardTitle>{t.mensajes.tabArrendatarios}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">{t.comun.cargando}</p>
              ) : (
                <>
                  {propiedades.length > 0 && (
                    <div className="mb-4 flex items-center gap-2">
                      <label className="text-sm font-medium text-muted-foreground">Filtrar por propiedad disponible:</label>
                      <select
                        value={propiedadSeleccionada}
                        onChange={(e) => setPropiedadSeleccionada(e.target.value)}
                        className="rounded border bg-background px-3 py-1.5 text-sm"
                      >
                        <option value="all">Todas mis propiedades disponibles</option>
                        {propiedades.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.direccion ? `${p.direccion}${p.ciudad ? `, ${p.ciudad}` : ""}` : p.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="relative flex-1">
                      <input
                        type="search"
                        value={busquedaNombre}
                        onChange={(e) => setBusquedaNombre(e.target.value)}
                        placeholder="Buscar por nombre…"
                        className="w-full rounded-lg border bg-background px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      {busquedaNombre && (
                        <button
                          type="button"
                          onClick={() => setBusquedaNombre("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                          aria-label="Limpiar búsqueda por nombre"
                          title="Limpiar"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="search"
                        inputMode="tel"
                        value={busquedaCelular}
                        onChange={(e) => setBusquedaCelular(e.target.value)}
                        placeholder="Buscar por celular…"
                        className="w-full rounded-lg border bg-background px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      {busquedaCelular && (
                        <button
                          type="button"
                          onClick={() => setBusquedaCelular("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                          aria-label="Limpiar búsqueda por celular"
                          title="Limpiar"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {busquedaActiva && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {intakeRegistrosBuscados.length} coincidencia
                          {intakeRegistrosBuscados.length === 1 ? "" : "s"}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setBusquedaNombre(""); setBusquedaCelular("") }}
                          className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
                        >
                          Limpiar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSubTabIntake("pendientes")}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          subTabIntake === "pendientes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.mensajes.pendientes}
                        {conteoPorSubtab.pendientes > 0 && (
                          <span className="ml-1.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-xs font-medium text-white">
                            {conteoPorSubtab.pendientes}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setSubTabIntake("gestionados")}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          subTabIntake === "gestionados" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.mensajes.gestionados}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({conteoPorSubtab.gestionados})
                        </span>
                      </button>
                      <button
                        onClick={() => setSubTabIntake("no_aceptados")}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          subTabIntake === "no_aceptados" ? "bg-red-600 text-white" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.mensajes.noAceptados}
                        <span className={`ml-1.5 text-xs ${subTabIntake === "no_aceptados" ? "text-white/80" : "text-muted-foreground"}`}>
                          ({conteoPorSubtab.no_aceptados})
                        </span>
                      </button>
                      <button
                        onClick={() => setSubTabIntake("completados")}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          subTabIntake === "completados" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.mensajes.completados}
                        <span className={`ml-1.5 text-xs ${subTabIntake === "completados" ? "text-white/80" : "text-muted-foreground"}`}>
                          ({conteoPorSubtab.completados})
                        </span>
                      </button>
                    </div>

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
                        <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">{seleccionados.size}</span>
                      )}
                    </button>
                  </div>

                  {(() => {
                    const baseLista = busquedaActiva ? intakeRegistrosBuscados : intakeRegistrosFiltrados
                    const lista = baseLista
                      .filter((r) => {
                        if (subTabIntake === "completados") return r.completado === true
                        if (subTabIntake === "no_aceptados") return r.descartado === true && !r.completado
                        if (subTabIntake === "gestionados") return r.gestionado && !r.descartado && !r.completado
                        return !r.gestionado && !r.descartado && !r.completado
                      })
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

                    if (lista.length === 0) {
                      if (busquedaActiva) {
                        return (
                          <p className="text-muted-foreground py-8">
                            Sin resultados para la búsqueda actual.
                          </p>
                        )
                      }
                      const vacioMsg =
                        subTabIntake === "pendientes"
                          ? t.mensajes.noHaySolicitudes
                          : subTabIntake === "gestionados"
                          ? t.mensajes.noHayGestionados
                          : subTabIntake === "completados"
                          ? t.mensajes.noHayCompletados
                          : t.mensajes.noHayNoAceptados
                      return (
                        <p className="text-muted-foreground py-8">{vacioMsg}</p>
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
                        role="propietario"
                        onEliminar={handleEliminarIntake}
                        onCompletar={handleCompletar}
                        onDescompletar={handleDescompletar}
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
