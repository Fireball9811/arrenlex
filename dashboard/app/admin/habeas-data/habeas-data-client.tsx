"use client"

import { useCallback, useEffect, useState, type ChangeEvent, type MouseEvent, type ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ESTADO_LABELS,
  ESTADO_VALUES,
  ORIGEN_LABELS,
  ORIGEN_VALUES,
  RESPONDER_ESTADO_FINAL_LABELS,
  RESPONDER_ESTADO_FINAL_VALUES,
  TIPO_SOLICITUD_LABELS,
  TIPO_SOLICITUD_VALUES,
  type EstadoHabeas,
  type ResponderEstadoFinal,
  type TipoSolicitudHabeas,
} from "@/lib/habeas-data/constants"
import { suggestedDeadlineForTipo } from "@/lib/habeas-data/deadline"

type HabeasRow = {
  id: string
  fecha_recibido: string
  nombre: string | null
  cedula: string | null
  email: string | null
  telefono: string | null
  tipo_solicitud: string | null
  descripcion: string | null
  estado: string | null
  fecha_limite_respuesta: string | null
  fecha_respuesta: string | null
  respuesta: string | null
  origen: string | null
  relacionado_form_intake_id: string | null
  created_at: string
  updated_at: string
  respuesta_asunto?: string | null
  respondido_por?: string | null
  respuesta_enviada?: boolean | null
  respuesta_error?: string | null
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatFecha(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

function estadoBadgeVariant(estado: string) {
  switch (estado) {
    case "rechazado":
      return "destructive" as const
    case "respondido":
      return "default" as const
    case "cerrado":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

const INTAKE_REL_LABELS: Record<string, string> = {
  nombre: "Nombre",
  email: "Email",
  cedula: "Cédula",
  tipo_solicitante: "Tipo solicitante",
  grupo_solicitud_id: "Grupo solicitud",
  autorizacion_aceptada: "Autorización aceptada",
  autorizacion_fecha: "Autorización fecha",
  autorizacion_version: "Autorización versión",
}

const DEFAULT_RESPONDER_SUBJECT = "Respuesta solicitud Habeas Data, Arrenlex SAS"

function defaultResponderBody(nombre: string | null): string {
  const n = (nombre ?? "").trim() || "Cliente"
  return `Hola ${n},

En atención a su solicitud relacionada con el tratamiento de datos personales, le informamos lo siguiente:

[Escriba aquí la respuesta]

Atentamente,

Arrenlex SAS
Canal Habeas Data
habeasdata@arrenlex.com`
}

const textareaClassName = cn(
  "placeholder:text-muted-foreground min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none md:text-sm",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
)

function HabeasModal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer: React.ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby={`habeas-modal-${title.replace(/\s+/g, "-").toLowerCase()}`}
        className={cn(
          "max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-6 shadow-lg",
          wide && "max-w-2xl"
        )}
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        <h2 id={`habeas-modal-${title.replace(/\s+/g, "-").toLowerCase()}`} className="mb-4 text-lg font-semibold">
          {title}
        </h2>
        {children}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-4">{footer}</div>
      </div>
    </div>
  )
}

export function HabeasDataClient() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [rows, setRows] = useState<HabeasRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState<string>("")
  const [filterTipo, setFilterTipo] = useState<string>("")
  const [searchQ, setSearchQ] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [viewData, setViewData] = useState<(HabeasRow & { intake_relacionado?: Record<string, unknown> | null }) | null>(
    null
  )
  const [editing, setEditing] = useState<HabeasRow | null>(null)

  const [limiteTouched, setLimiteTouched] = useState(false)

  const [cNombre, setCNombre] = useState("")
  const [cCedula, setCCedula] = useState("")
  const [cEmail, setCEmail] = useState("")
  const [cTelefono, setCTelefono] = useState("")
  const [cTipo, setCTipo] = useState<TipoSolicitudHabeas>("consulta")
  const [cDesc, setCDesc] = useState("")
  const [cEstado, setCEstado] = useState<EstadoHabeas>("recibido")
  const [cFechaRec, setCFechaRec] = useState(() => toDatetimeLocalValue(new Date()))
  const [cFechaLim, setCFechaLim] = useState("")
  const [cOrigen, setCOrigen] = useState<string>("correo")
  const [cIntakeId, setCIntakeId] = useState<string | null>(null)
  const [cIntakeSearch, setCIntakeSearch] = useState("")
  const [cIntakeResults, setCIntakeResults] = useState<{ id: string; nombre?: string | null; email?: string | null; cedula?: string | null }[]>([])

  const [eTipo, setETipo] = useState<TipoSolicitudHabeas>("consulta")
  const [eDesc, setEDesc] = useState("")
  const [eEstado, setEEstado] = useState<EstadoHabeas>("recibido")
  const [eFechaLim, setEFechaLim] = useState("")
  const [eFechaResp, setEFechaResp] = useState("")
  const [eRespuesta, setERespuesta] = useState("")
  const [eOrigen, setEOrigen] = useState("correo")
  const [eIntakeId, setEIntakeId] = useState<string | null>(null)
  const [eIntakeSearch, setEIntakeSearch] = useState("")
  const [eIntakeResults, setEIntakeResults] = useState<{ id: string; nombre?: string | null; email?: string | null; cedula?: string | null }[]>([])

  const [responderOpen, setResponderOpen] = useState(false)
  const [responderRow, setResponderRow] = useState<HabeasRow | null>(null)
  const [rTo, setRTo] = useState("")
  const [rSubject, setRSubject] = useState(DEFAULT_RESPONDER_SUBJECT)
  const [rMessage, setRMessage] = useState("")
  const [rEstadoFinal, setREstadoFinal] = useState<ResponderEstadoFinal>("respondido")
  const [responderManual, setResponderManual] = useState(false)
  const [responderMailto, setResponderMailto] = useState("")
  const [responderBanner, setResponderBanner] = useState("")
  const [dupOpen, setDupOpen] = useState(false)
  const [dupTarget, setDupTarget] = useState<HabeasRow | null>(null)
  const [bannerSuccess, setBannerSuccess] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQ.trim()), 350)
    return () => clearTimeout(t)
  }, [searchQ])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filterEstado) p.set("estado", filterEstado)
      if (filterTipo) p.set("tipo_solicitud", filterTipo)
      if (searchDebounced) p.set("q", searchDebounced)
      const res = await fetch(`/api/admin/habeas-data?${p.toString()}`)
      if (res.status === 401 || res.status === 403) {
        setAllowed(false)
        setRows([])
        return
      }
      setAllowed(true)
      if (!res.ok) {
        setRows([])
        return
      }
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [filterEstado, filterTipo, searchDebounced])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (!createOpen || limiteTouched) return
    const base = new Date(cFechaRec)
    if (Number.isNaN(base.getTime())) return
    const sug = suggestedDeadlineForTipo(base, cTipo)
    setCFechaLim(toDatetimeLocalValue(sug))
  }, [cTipo, cFechaRec, createOpen, limiteTouched])

  function openCreate() {
    setLimiteTouched(false)
    setCNombre("")
    setCCedula("")
    setCEmail("")
    setCTelefono("")
    setCTipo("consulta")
    setCDesc("")
    setCEstado("recibido")
    const now = new Date()
    setCFechaRec(toDatetimeLocalValue(now))
    setCOrigen("correo")
    setCIntakeId(null)
    setCIntakeSearch("")
    setCIntakeResults([])
    const sug = suggestedDeadlineForTipo(now, "consulta")
    setCFechaLim(toDatetimeLocalValue(sug))
    setCreateOpen(true)
  }

  async function buscarIntakeCreate() {
    const q = cIntakeSearch.trim()
    if (q.length < 2) return
    const res = await fetch(`/api/admin/habeas-data/buscar-intake?q=${encodeURIComponent(q)}`)
    const j = await res.json()
    setCIntakeResults(Array.isArray(j.results) ? j.results : [])
  }

  async function buscarIntakeEdit() {
    const q = eIntakeSearch.trim()
    if (q.length < 2) return
    const res = await fetch(`/api/admin/habeas-data/buscar-intake?q=${encodeURIComponent(q)}`)
    const j = await res.json()
    setEIntakeResults(Array.isArray(j.results) ? j.results : [])
  }

  async function submitCreate() {
    setSaving(true)
    try {
      const fecha_recibido = new Date(cFechaRec).toISOString()
      const fecha_limite_respuesta = cFechaLim ? new Date(cFechaLim).toISOString() : null
      const res = await fetch("/api/admin/habeas-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: cNombre,
          cedula: cCedula,
          email: cEmail,
          telefono: cTelefono || null,
          tipo_solicitud: cTipo,
          descripcion: cDesc,
          estado: cEstado,
          fecha_recibido,
          fecha_limite_respuesta,
          origen: cOrigen,
          relacionado_form_intake_id: cIntakeId,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(typeof err.error === "string" ? err.error : "Error al guardar")
        return
      }
      setCreateOpen(false)
      void loadList()
    } finally {
      setSaving(false)
    }
  }

  function openEdit(row: HabeasRow) {
    setEditing(row)
    setETipo((row.tipo_solicitud as TipoSolicitudHabeas) || "consulta")
    setEDesc(row.descripcion ?? "")
    setEEstado((row.estado as EstadoHabeas) || "recibido")
    setEFechaLim(row.fecha_limite_respuesta ? toDatetimeLocalValue(new Date(row.fecha_limite_respuesta)) : "")
    setEFechaResp(row.fecha_respuesta ? toDatetimeLocalValue(new Date(row.fecha_respuesta)) : "")
    setERespuesta(row.respuesta ?? "")
    setEOrigen(row.origen ?? "correo")
    setEIntakeId(row.relacionado_form_intake_id)
    setEIntakeSearch("")
    setEIntakeResults([])
    setEditOpen(true)
  }

  async function submitEdit() {
    if (!editing) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        tipo_solicitud: eTipo,
        descripcion: eDesc,
        estado: eEstado,
        fecha_limite_respuesta: eFechaLim ? new Date(eFechaLim).toISOString() : null,
        fecha_respuesta: eFechaResp ? new Date(eFechaResp).toISOString() : null,
        respuesta: eRespuesta || null,
        origen: eOrigen,
        relacionado_form_intake_id: eIntakeId,
      }
      const res = await fetch(`/api/admin/habeas-data/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(typeof err.error === "string" ? err.error : "Error al guardar")
        return
      }
      setEditOpen(false)
      void loadList()
    } finally {
      setSaving(false)
    }
  }

  async function openView(row: HabeasRow) {
    setViewOpen(true)
    setViewData(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/habeas-data/${row.id}`)
      if (!res.ok) {
        setViewData(row)
        return
      }
      const data = await res.json()
      setViewData(data)
    } finally {
      setDetailLoading(false)
    }
  }

  function openResponderModal(row: HabeasRow) {
    setResponderRow(row)
    setRTo(row.email ?? "")
    setRSubject(DEFAULT_RESPONDER_SUBJECT)
    setRMessage(defaultResponderBody(row.nombre))
    setREstadoFinal("respondido")
    setResponderManual(false)
    setResponderMailto("")
    setResponderBanner("")
    setResponderOpen(true)
  }

  function requestResponder(row: HabeasRow) {
    if (row.estado === "respondido" || row.estado === "cerrado") {
      setDupTarget(row)
      setDupOpen(true)
      return
    }
    openResponderModal(row)
  }

  function confirmDupResponder() {
    if (dupTarget) openResponderModal(dupTarget)
    setDupOpen(false)
    setDupTarget(null)
  }

  async function postResponder(confirmManualSend: boolean) {
    if (!responderRow) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/habeas-data/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: responderRow.id,
          to: rTo.trim(),
          subject: rSubject.trim(),
          message: rMessage,
          estado: rEstadoFinal,
          confirmManualSend,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (res.ok && data.needsManual === true) {
        setResponderManual(true)
        setResponderMailto(typeof data.mailtoUrl === "string" ? data.mailtoUrl : "")
        setResponderBanner(
          typeof data.message === "string"
            ? data.message
            : "Correo preparado. Envíelo desde habeasdata@arrenlex.com y confirme el envío."
        )
        return
      }
      if (res.ok && data.ok === true) {
        setBannerSuccess(
          typeof data.message === "string" ? data.message : "Respuesta enviada y solicitud actualizada."
        )
        setResponderOpen(false)
        setResponderRow(null)
        void loadList()
        return
      }
      alert(typeof data.error === "string" ? data.error : "Error al procesar la respuesta")
    } finally {
      setSaving(false)
    }
  }

  if (allowed === false) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800">
        <p className="text-lg font-semibold">Acceso no autorizado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {bannerSuccess ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-900">
          <span>{bannerSuccess}</span>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 text-green-900" onClick={() => setBannerSuccess("")}>
            Cerrar
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Habeas Data</CardTitle>
          <CardDescription>Control interno de solicitudes de tratamiento de datos personales.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={filterEstado || "__all"} onValueChange={(v) => setFilterEstado(v === "__all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {ESTADO_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {ESTADO_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo solicitud</Label>
            <Select value={filterTipo || "__all"} onValueChange={(v) => setFilterTipo(v === "__all" ? "" : v)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {TIPO_SOLICITUD_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {TIPO_SOLICITUD_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="habeas-q">Buscar (nombre, cédula o email)</Label>
            <Input id="habeas-q" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Buscar…" />
          </div>
          <Button type="button" onClick={openCreate}>
            Nueva solicitud
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha recibido</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo solicitud</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha límite</TableHead>
                  <TableHead>Fecha respuesta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Cargando…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Sin registros
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{formatFecha(r.fecha_recibido)}</TableCell>
                      <TableCell>{r.nombre ?? "—"}</TableCell>
                      <TableCell>{r.cedula ?? "—"}</TableCell>
                      <TableCell>{r.email ?? "—"}</TableCell>
                      <TableCell>
                        {r.tipo_solicitud && TIPO_SOLICITUD_LABELS[r.tipo_solicitud as TipoSolicitudHabeas]
                          ? TIPO_SOLICITUD_LABELS[r.tipo_solicitud as TipoSolicitudHabeas]
                          : r.tipo_solicitud ?? "—"}
                      </TableCell>
                      <TableCell>
                        {r.estado && ESTADO_LABELS[r.estado as EstadoHabeas] ? (
                          <Badge variant={estadoBadgeVariant(r.estado)}>{ESTADO_LABELS[r.estado as EstadoHabeas]}</Badge>
                        ) : (
                          r.estado ?? "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatFecha(r.fecha_limite_respuesta)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatFecha(r.fecha_respuesta)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => void openView(r)}>
                            Ver
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(r)}>
                            Editar
                          </Button>
                          <Button type="button" size="sm" onClick={() => requestResponder(r)}>
                            Responder
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <HabeasModal
        open={createOpen}
        title="Nueva solicitud"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submitCreate()}>
              Guardar
            </Button>
          </>
        }
      >
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="cn-nombre">Nombre *</Label>
              <Input id="cn-nombre" value={cNombre} onChange={(e) => setCNombre(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cn-cedula">Cédula *</Label>
              <Input id="cn-cedula" value={cCedula} onChange={(e) => setCCedula(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cn-email">Email *</Label>
              <Input id="cn-email" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cn-tel">Teléfono</Label>
              <Input id="cn-tel" value={cTelefono} onChange={(e) => setCTelefono(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de solicitud *</Label>
              <Select value={cTipo} onValueChange={(v) => setCTipo(v as TipoSolicitudHabeas)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_SOLICITUD_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {TIPO_SOLICITUD_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cn-desc">Descripción *</Label>
              <textarea
                id="cn-desc"
                rows={3}
                className={textareaClassName}
                value={cDesc}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCDesc(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Estado *</Label>
              <Select value={cEstado} onValueChange={(v) => setCEstado(v as EstadoHabeas)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {ESTADO_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cn-frec">Fecha recibido</Label>
              <Input
                id="cn-frec"
                type="datetime-local"
                value={cFechaRec}
                onChange={(e) => {
                  setCFechaRec(e.target.value)
                  setLimiteTouched(false)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cn-flim">Fecha límite</Label>
              <Input
                id="cn-flim"
                type="datetime-local"
                value={cFechaLim}
                onChange={(e) => {
                  setCFechaLim(e.target.value)
                  setLimiteTouched(true)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Origen de la solicitud</Label>
              <Select value={cOrigen} onValueChange={setCOrigen}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGEN_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {ORIGEN_LABELS[v] ?? v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <Label>Solicitud relacionada</Label>
              <p className="text-xs text-muted-foreground">Buscar aplicación relacionada</p>
              <div className="flex gap-2">
                <Input
                  value={cIntakeSearch}
                  onChange={(e) => setCIntakeSearch(e.target.value)}
                  placeholder="Nombre, cédula o email"
                />
                <Button type="button" variant="secondary" onClick={() => void buscarIntakeCreate()}>
                  Buscar
                </Button>
              </div>
              {cIntakeId && <p className="font-mono text-xs">Seleccionado: {cIntakeId}</p>}
              <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
                {cIntakeResults.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      className="w-full rounded border px-2 py-1 text-left hover:bg-muted"
                      onClick={() => setCIntakeId(it.id)}
                    >
                      {it.nombre ?? "—"} · {it.cedula ?? "—"} · {it.email ?? "—"}
                    </button>
                  </li>
                ))}
              </ul>
              {cIntakeId && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setCIntakeId(null)}>
                  Quitar vínculo
                </Button>
              )}
            </div>
          </div>
      </HabeasModal>

      <HabeasModal
        open={editOpen}
        title="Editar"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submitEdit()}>
              Guardar
            </Button>
          </>
        }
      >
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Tipo de solicitud</Label>
              <Select value={eTipo} onValueChange={(v) => setETipo(v as TipoSolicitudHabeas)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_SOLICITUD_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {TIPO_SOLICITUD_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-desc">Descripción</Label>
              <textarea
                id="e-desc"
                rows={3}
                className={textareaClassName}
                value={eDesc}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEDesc(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={eEstado} onValueChange={(v) => setEEstado(v as EstadoHabeas)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {ESTADO_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-flim">Fecha límite</Label>
              <Input id="e-flim" type="datetime-local" value={eFechaLim} onChange={(e) => setEFechaLim(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-fresp">Fecha respuesta</Label>
              <Input id="e-fresp" type="datetime-local" value={eFechaResp} onChange={(e) => setEFechaResp(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-resp">Respuesta</Label>
              <textarea
                id="e-resp"
                rows={3}
                className={textareaClassName}
                value={eRespuesta}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setERespuesta(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Origen de la solicitud</Label>
              <Select value={eOrigen} onValueChange={setEOrigen}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGEN_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {ORIGEN_LABELS[v] ?? v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <Label>Solicitud relacionada</Label>
              <p className="text-xs text-muted-foreground">Buscar aplicación relacionada</p>
              <div className="flex gap-2">
                <Input value={eIntakeSearch} onChange={(e) => setEIntakeSearch(e.target.value)} placeholder="Nombre, cédula o email" />
                <Button type="button" variant="secondary" onClick={() => void buscarIntakeEdit()}>
                  Buscar
                </Button>
              </div>
              {eIntakeId && <p className="font-mono text-xs">Seleccionado: {eIntakeId}</p>}
              <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
                {eIntakeResults.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      className="w-full rounded border px-2 py-1 text-left hover:bg-muted"
                      onClick={() => setEIntakeId(it.id)}
                    >
                      {it.nombre ?? "—"} · {it.cedula ?? "—"} · {it.email ?? "—"}
                    </button>
                  </li>
                ))}
              </ul>
              {eIntakeId && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEIntakeId(null)}>
                  Quitar vínculo
                </Button>
              )}
            </div>
          </div>
      </HabeasModal>

      <HabeasModal
        open={viewOpen}
        title="Detalle"
        onClose={() => setViewOpen(false)}
        footer={
          <Button type="button" variant="outline" onClick={() => setViewOpen(false)}>
            Cancelar
          </Button>
        }
      >
          {detailLoading || !viewData ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-2 gap-y-2">
                <dt className="text-muted-foreground">Fecha recibido</dt>
                <dd>{formatFecha(viewData.fecha_recibido)}</dd>
                <dt className="text-muted-foreground">Nombre</dt>
                <dd>{viewData.nombre ?? "—"}</dd>
                <dt className="text-muted-foreground">Cédula</dt>
                <dd>{viewData.cedula ?? "—"}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{viewData.email ?? "—"}</dd>
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd>{viewData.telefono ?? "—"}</dd>
                <dt className="text-muted-foreground">Tipo de solicitud</dt>
                <dd>
                  {viewData.tipo_solicitud && TIPO_SOLICITUD_LABELS[viewData.tipo_solicitud as TipoSolicitudHabeas]
                    ? TIPO_SOLICITUD_LABELS[viewData.tipo_solicitud as TipoSolicitudHabeas]
                    : viewData.tipo_solicitud ?? "—"}
                </dd>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd className="whitespace-pre-wrap">{viewData.descripcion ?? "—"}</dd>
                <dt className="text-muted-foreground">Estado</dt>
                <dd>
                  {viewData.estado && ESTADO_LABELS[viewData.estado as EstadoHabeas] ? (
                    <Badge variant={estadoBadgeVariant(viewData.estado!)}>{ESTADO_LABELS[viewData.estado as EstadoHabeas]}</Badge>
                  ) : (
                    viewData.estado ?? "—"
                  )}
                </dd>
                <dt className="text-muted-foreground">Fecha límite</dt>
                <dd>{formatFecha(viewData.fecha_limite_respuesta)}</dd>
                <dt className="text-muted-foreground">Origen de la solicitud</dt>
                <dd>
                  {viewData.origen && viewData.origen in ORIGEN_LABELS
                    ? ORIGEN_LABELS[viewData.origen as keyof typeof ORIGEN_LABELS]
                    : viewData.origen ?? "—"}
                </dd>
                <dt className="text-muted-foreground">Solicitud relacionada (id)</dt>
                <dd className="break-all font-mono text-xs">{viewData.relacionado_form_intake_id ?? "—"}</dd>
              </dl>

              <div className="rounded-md border p-3">
                <p className="mb-2 font-semibold">Respuesta</p>
                <dl className="grid gap-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Fecha respuesta</dt>
                    <dd>{formatFecha(viewData.fecha_respuesta)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Respuesta</dt>
                    <dd className="whitespace-pre-wrap">{viewData.respuesta ?? "—"}</dd>
                  </div>
                  {viewData.respuesta_asunto ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Asunto enviado</dt>
                      <dd>{viewData.respuesta_asunto}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs text-muted-foreground">Correo enviado automáticamente</dt>
                    <dd>{viewData.respuesta_enviada === true ? "Sí" : viewData.respuesta_enviada === false ? "No" : "—"}</dd>
                  </div>
                  {viewData.respuesta_error ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Nota / error envío</dt>
                      <dd className="whitespace-pre-wrap text-amber-900">{viewData.respuesta_error}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {viewData.relacionado_form_intake_id && (
                <div className="rounded-md border p-3">
                  <p className="mb-2 font-semibold">Solicitud relacionada</p>
                  {viewData.intake_relacionado && Object.keys(viewData.intake_relacionado).length > 0 ? (
                    <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-2 gap-y-2">
                      {[
                        "nombre",
                        "email",
                        "cedula",
                        "tipo_solicitante",
                        "grupo_solicitud_id",
                        "autorizacion_aceptada",
                        "autorizacion_fecha",
                        "autorizacion_version",
                      ].map((k) => {
                        const v = viewData.intake_relacionado![k]
                        return (
                          <div key={k} className="contents">
                            <dt className="text-muted-foreground">{INTAKE_REL_LABELS[k] ?? k}</dt>
                            <dd className="break-all">{v === null || v === undefined ? "—" : String(v)}</dd>
                          </div>
                        )
                      })}
                    </dl>
                  ) : (
                    <p className="text-xs text-muted-foreground">No hay datos de la solicitud o no tiene permiso para verlos.</p>
                  )}
                </div>
              )}
            </div>
          )}
      </HabeasModal>

      <HabeasModal
        wide
        open={responderOpen}
        title="Responder solicitud Habeas Data"
        onClose={() => {
          setResponderOpen(false)
          setResponderRow(null)
        }}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResponderOpen(false)
                setResponderRow(null)
              }}
            >
              Cancelar
            </Button>
            {responderManual ? (
              <Button type="button" disabled={saving} onClick={() => void postResponder(true)}>
                Guardar respuesta
              </Button>
            ) : (
              <Button type="button" disabled={saving} onClick={() => void postResponder(false)}>
                Enviar respuesta
              </Button>
            )}
          </>
        }
      >
        {responderRow ? (
          <div className="grid gap-4 py-1">
            {responderBanner ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p>{responderBanner}</p>
                {responderMailto ? (
                  <a
                    href={responderMailto}
                    className="mt-2 inline-block font-medium text-sky-800 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir cliente de correo
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="mb-2 font-semibold text-muted-foreground">Datos de la solicitud</p>
              <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-2 gap-y-1.5">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd>{responderRow.nombre ?? "—"}</dd>
                <dt className="text-muted-foreground">Cédula</dt>
                <dd>{responderRow.cedula ?? "—"}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{responderRow.email ?? "—"}</dd>
                <dt className="text-muted-foreground">Tipo de solicitud</dt>
                <dd>
                  {responderRow.tipo_solicitud && TIPO_SOLICITUD_LABELS[responderRow.tipo_solicitud as TipoSolicitudHabeas]
                    ? TIPO_SOLICITUD_LABELS[responderRow.tipo_solicitud as TipoSolicitudHabeas]
                    : responderRow.tipo_solicitud ?? "—"}
                </dd>
                <dt className="text-muted-foreground">Estado actual</dt>
                <dd>
                  {responderRow.estado && ESTADO_LABELS[responderRow.estado as EstadoHabeas]
                    ? ESTADO_LABELS[responderRow.estado as EstadoHabeas]
                    : responderRow.estado ?? "—"}
                </dd>
                <dt className="text-muted-foreground">Fecha recibido</dt>
                <dd>{formatFecha(responderRow.fecha_recibido)}</dd>
                <dt className="text-muted-foreground">Fecha límite</dt>
                <dd>{formatFecha(responderRow.fecha_limite_respuesta)}</dd>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd className="whitespace-pre-wrap">{responderRow.descripcion ?? "—"}</dd>
              </dl>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="r-to">Para</Label>
              <Input id="r-to" type="email" readOnly value={rTo} className="bg-muted/50" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-subject">Asunto</Label>
              <Input id="r-subject" value={rSubject} onChange={(e) => setRSubject(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-msg">Mensaje</Label>
              <textarea
                id="r-msg"
                rows={12}
                className={textareaClassName}
                value={rMessage}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRMessage(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Estado final</Label>
              <Select value={rEstadoFinal} onValueChange={(v) => setREstadoFinal(v as ResponderEstadoFinal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONDER_ESTADO_FINAL_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {RESPONDER_ESTADO_FINAL_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </HabeasModal>

      <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar</AlertDialogTitle>
            <AlertDialogDescription>
              Esta solicitud ya tiene respuesta registrada. Si continúa, se guardará una nueva actualización sobre la
              respuesta existente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDupTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDupResponder()}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
