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
  const [subTabIntake, setSubTabIntake] = useState<"pendientes" | "gestionados">("pendientes")
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mostrarComparacion, setMostrarComparacion] = useState(false)
  const [propiedades, setPropiedades] = useState<Array<{ id: string; direccion?: string; ciudad?: string }>>([])
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
    Promise.all([fetchSolicitudes(), fetchIntake()]).finally(() => setLoading(false))
  }, [fetchSolicitudes, fetchIntake])

  useEffect(() => {
    fetch("/api/propietario/propiedades")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ id: string; direccion?: string; ciudad?: string }>) => {
        setPropiedades(Array.isArray(data) ? data : [])
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
          registro={intakeSeleccionado}
          role="propietario"
          onCerrar={() => setIntakeSeleccionado(null)}
          onPasarArrendatario={handlePasarArrendatario}
        />
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
                      <label className="text-sm font-medium text-muted-foreground">Filtrar por propiedad:</label>
                      <select
                        value={propiedadSeleccionada}
                        onChange={(e) => setPropiedadSeleccionada(e.target.value)}
                        className="rounded border bg-background px-3 py-1.5 text-sm"
                      >
                        <option value="all">Todas mis propiedades</option>
                        {propiedades.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.direccion ? `${p.direccion}${p.ciudad ? `, ${p.ciudad}` : ""}` : p.id}
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
                          subTabIntake === "pendientes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
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
                          subTabIntake === "gestionados" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.mensajes.gestionados}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({intakeRegistrosFiltrados.filter((r) => r.gestionado).length})
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
                    const lista = intakeRegistrosFiltrados
                      .filter((r) => (subTabIntake === "pendientes" ? !r.gestionado : r.gestionado))
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

                    if (lista.length === 0) {
                      return (
                        <p className="text-muted-foreground py-8">
                          {subTabIntake === "pendientes" ? t.mensajes.noHaySolicitudes : t.mensajes.noHayGestionados}
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
                        role="propietario"
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
