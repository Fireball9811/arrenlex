"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Paperclip, ExternalLink, Loader2, X, ChevronDown, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLang } from "@/lib/i18n/context"

type Adjunto = {
  id: string
  nombre_archivo: string
  storage_path: string
  tipo: "factura" | "foto" | "otro"
  created_at: string
}

type Gestion = {
  id: string
  solicitud_id: string
  fecha_ejecucion: string
  descripcion: string
  proveedor: string | null
  costo: number
  created_at: string
  mantenimiento_adjuntos: Adjunto[]
}

type Solicitud = {
  id: string
  nombre_completo: string
  detalle: string
  desde_cuando: string
  status: "pendiente" | "ejecucion" | "completado"
  responsable: string | null
  created_at: string
  propiedades: { direccion: string; ciudad: string } | null
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(s: string) {
  if (!s) return "—"
  const [y, m, d] = s.split("T")[0].split("-")
  return `${d}/${m}/${y}`
}

function parseCOPInput(val: string): number {
  const raw = val.replace(/[^0-9]/g, "")
  return raw === "" ? 0 : parseInt(raw, 10)
}

function formatCOPInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "")
  if (digits === "") return ""
  return "$ " + Number(digits).toLocaleString("es-CO")
}

const STATUS_COLOR: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  ejecucion: "bg-blue-100 text-blue-800 border-blue-200",
  completado: "bg-green-100 text-green-800 border-green-200",
}

const TIPO_COLOR: Record<string, string> = {
  factura: "bg-blue-50 border-blue-200 text-blue-700",
  foto: "bg-purple-50 border-purple-200 text-purple-700",
  otro: "bg-gray-50 border-gray-200 text-gray-700",
}

type FormState = {
  fecha_ejecucion: string
  descripcion: string
  proveedor: string
  costo: string
}

const EMPTY_FORM: FormState = { fecha_ejecucion: "", descripcion: "", proveedor: "", costo: "" }

// ─── ProveedorInput: campo texto + dropdown histórico ─────────────────────────

type ProveedorInputProps = {
  value: string
  onChange: (val: string) => void
  placeholder: string
  proveedoresHistoricos: string[]
}

function ProveedorInput({ value, onChange, placeholder, proveedoresHistoricos }: ProveedorInputProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filtrar por lo que el usuario escribe (case-insensitive)
  const sugerencias = proveedoresHistoricos.filter(
    (p) => p.toLowerCase().includes(value.toLowerCase()) && p.toLowerCase() !== value.toLowerCase()
  )

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSelect = (nombre: string) => {
    onChange(nombre)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex">
        <input
          type="text"
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm rounded-r-none border-r-0"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center rounded-r-md border border-input bg-muted px-2 hover:bg-muted/80 transition-colors"
          tabIndex={-1}
          title="Ver proveedores anteriores"
        >
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && proveedoresHistoricos.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg">
          {/* Lista filtrada o lista completa si no hay texto */}
          {(value ? sugerencias : proveedoresHistoricos).length === 0 ? null : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {(value ? sugerencias : proveedoresHistoricos).map((p) => (
                <li
                  key={p}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
                  className="flex items-center gap-2 cursor-pointer px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <span className="text-muted-foreground text-xs">↩</span>
                  {p}
                </li>
              ))}
            </ul>
          )}
          {value && sugerencias.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No matches — press Enter to use "{value}"</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── AdjuntosPanel ────────────────────────────────────────────────────────────

type AdjuntosPanelProps = {
  gestion: Gestion
  solicitudId: string
  onRefresh: () => Promise<void>
}

function AdjuntosPanel({ gestion, solicitudId, onRefresh }: AdjuntosPanelProps) {
  const { t } = useLang()
  const g = t.mantenimiento.gestiones

  const [uploadTipo, setUploadTipo] = useState<"factura" | "foto" | "otro">("factura")
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tipoLabel: Record<string, string> = {
    factura: g.tipoFactura,
    foto: g.tipoFoto,
    otro: g.tipoOtro,
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("tipo", uploadTipo)
      await fetch(`/api/mantenimiento/${solicitudId}/gestiones/${gestion.id}/adjuntos`, {
        method: "POST",
        body: fd,
      })
      await onRefresh()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleView = async (adjuntoId: string) => {
    const res = await fetch(`/api/mantenimiento/adjuntos/${adjuntoId}`)
    if (!res.ok) return
    const { url } = await res.json()
    window.open(url, "_blank")
  }

  const handleDelete = async (adjuntoId: string) => {
    if (!confirm(g.confirmarEliminarAdjunto)) return
    setDeletingId(adjuntoId)
    try {
      await fetch(`/api/mantenimiento/adjuntos/${adjuntoId}`, { method: "DELETE" })
      await onRefresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {g.adjuntos} ({gestion.mantenimiento_adjuntos.length})
      </p>

      {gestion.mantenimiento_adjuntos.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{g.sinArchivos}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {gestion.mantenimiento_adjuntos.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between gap-1 rounded border px-2 py-1.5 text-xs ${TIPO_COLOR[a.tipo]}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[120px] font-medium" title={a.nombre_archivo}>
                  {a.nombre_archivo}
                </span>
                <span className="shrink-0 opacity-60">({tipoLabel[a.tipo]})</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleView(a.id)}
                  className="rounded p-0.5 hover:bg-black/10 transition-colors"
                  title={g.verArchivo}
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="rounded p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title={g.eliminarAdjunto}
                >
                  {deletingId === a.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <X className="h-3 w-3" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-1 flex flex-col gap-1.5 border-t pt-2">
        <select
          value={uploadTipo}
          onChange={(e) => setUploadTipo(e.target.value as "factura" | "foto" | "otro")}
          className="w-full rounded border bg-background px-2 py-1 text-xs"
        >
          <option value="factura">{g.tipoFactura}</option>
          <option value="foto">{g.tipoFoto}</option>
          <option value="otro">{g.tipoOtro}</option>
        </select>
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 transition-colors">
          {uploading
            ? <><Loader2 className="h-3 w-3 animate-spin" /> {g.subiendo}</>
            : <><Paperclip className="h-3 w-3" /> {g.adjuntarArchivo}</>
          }
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />
        </label>
        <p className="text-center text-[10px] text-muted-foreground">{g.formatosAceptados}</p>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MantenimientoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useLang()
  const g = t.mantenimiento.gestiones

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [gestiones, setGestiones] = useState<Gestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)
  const [editLoading, setEditLoading] = useState(false)

  const [deletingGestionId, setDeletingGestionId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [proveedoresHistoricos, setProveedoresHistoricos] = useState<string[]>([])

  const fetchSolicitud = useCallback(async () => {
    const res = await fetch(`/api/mantenimiento/${id}`)
    if (!res.ok) { setError(t.comun.error); return }
    setSolicitud(await res.json())
  }, [id, t.comun.error])

  const fetchGestiones = useCallback(async () => {
    const res = await fetch(`/api/mantenimiento/${id}/gestiones`)
    if (!res.ok) return
    const data = await res.json()
    setGestiones(Array.isArray(data) ? data : [])
  }, [id])

  useEffect(() => {
    Promise.all([fetchSolicitud(), fetchGestiones()]).finally(() => setLoading(false))
    // Cargar proveedores históricos en paralelo
    fetch("/api/mantenimiento/proveedores")
      .then((r) => r.ok ? r.json() : [])
      .then((data: string[]) => setProveedoresHistoricos(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [fetchSolicitud, fetchGestiones])

  const handleChangeStatus = async (newStatus: string) => {
    setUpdatingStatus(true)
    try {
      await fetch(`/api/mantenimiento/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      await fetchSolicitud()
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSubmitGestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/mantenimiento/${id}/gestiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha_ejecucion: form.fecha_ejecucion,
          descripcion: form.descripcion,
          proveedor: form.proveedor || undefined,
          costo: parseCOPInput(form.costo),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setFormError(d.error ?? g.errorGuardar)
        return
      }
      setForm(EMPTY_FORM)
      setShowForm(false)
      await fetchGestiones()
    } catch {
      setFormError(g.errorConexion)
    } finally {
      setFormLoading(false)
    }
  }

  const startEdit = (gestion: Gestion) => {
    setEditingId(gestion.id)
    setEditForm({
      fecha_ejecucion: gestion.fecha_ejecucion,
      descripcion: gestion.descripcion,
      proveedor: gestion.proveedor ?? "",
      costo: gestion.costo > 0 ? "$ " + gestion.costo.toLocaleString("es-CO") : "",
    })
  }

  const handleSaveEdit = async (gestionId: string) => {
    setEditLoading(true)
    try {
      await fetch(`/api/mantenimiento/${id}/gestiones/${gestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha_ejecucion: editForm.fecha_ejecucion,
          descripcion: editForm.descripcion,
          proveedor: editForm.proveedor || null,
          costo: parseCOPInput(editForm.costo),
        }),
      })
      setEditingId(null)
      await fetchGestiones()
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteGestion = async (gestionId: string) => {
    if (!confirm(g.confirmarEliminarRegistro)) return
    setDeletingGestionId(gestionId)
    try {
      await fetch(`/api/mantenimiento/${id}/gestiones/${gestionId}`, { method: "DELETE" })
      await fetchGestiones()
    } finally {
      setDeletingGestionId(null)
    }
  }

  const totalGastado = gestiones.reduce((acc, ges) => acc + Number(ges.costo), 0)

  const handleExportar = async () => {
    try {
      const res = await fetch(`/api/mantenimiento/${id}/gestiones/exportar`)
      if (!res.ok) {
        const errorData = await res.json()
        alert(`Error: ${errorData.error || 'No se pudo exportar'}`)
        return
      }

      // Obtener el blob y descargar
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mantenimiento-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      alert('Error al exportar: ' + error)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">{t.comun.cargando}</div>
  if (error || !solicitud) return (
    <div className="p-6">
      <p className="text-red-600">{error ?? t.comun.error}</p>
      <Button variant="outline" className="mt-4" onClick={() => router.push("/mantenimiento")}>
        {t.comun.volver}
      </Button>
    </div>
  )

  const propRef = solicitud.propiedades
    ? [solicitud.propiedades.direccion, solicitud.propiedades.ciudad].filter(Boolean).join(", ")
    : id

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/mantenimiento" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" />
          {g.volverMantenimiento}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{g.titulo}</h1>
            <p className="text-muted-foreground">{propRef}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLOR[solicitud.status]}`}>
              {g.estados[solicitud.status as keyof typeof g.estados]}
            </span>
            <select
              value={solicitud.status}
              onChange={(e) => handleChangeStatus(e.target.value)}
              disabled={updatingStatus}
              className="rounded border bg-background px-2 py-1 text-sm"
            >
              <option value="pendiente">{g.estados.pendiente}</option>
              <option value="ejecucion">{g.estados.ejecucion}</option>
              <option value="completado">{g.estados.completado}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info solicitud */}
      <Card className="mb-6">
        <CardContent className="pt-4 grid gap-2 text-sm md:grid-cols-2">
          <div><span className="font-medium text-muted-foreground">{g.reportadoPor} </span>{solicitud.nombre_completo}</div>
          <div><span className="font-medium text-muted-foreground">{g.reportadoEl} </span>{formatDate(solicitud.created_at)}</div>
          <div><span className="font-medium text-muted-foreground">{g.problemaDesdE} </span>{formatDate(solicitud.desde_cuando)}</div>
          {solicitud.responsable && (
            <div><span className="font-medium text-muted-foreground">{g.asignadoA} </span>{solicitud.responsable}</div>
          )}
          <div className="md:col-span-2"><span className="font-medium text-muted-foreground">{g.descripcion} </span>{solicitud.detalle}</div>
        </CardContent>
      </Card>

      {/* Gestiones header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{g.registros}</h2>
          <p className="text-xs text-muted-foreground">{gestiones.length} {gestiones.length === 1 ? g.registrosTotales : g.registrosTotalesPlural}</p>
        </div>
        <div className="flex items-center gap-2">
          {gestiones.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleExportar}>
              <Download className="mr-1 h-4 w-4" />
              Exportar Excel
            </Button>
          )}
          <Button size="sm" onClick={() => { setShowForm(true); setFormError(null) }}>
            <Plus className="mr-1 h-4 w-4" />
            {g.agregarRegistro}
          </Button>
        </div>
      </div>

      {/* Form nueva gestión */}
      {showForm && (
        <Card className="mb-6 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">{g.nuevoRegistro}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitGestion} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{g.fechaEjecucion}</label>
                <input
                  type="date"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.fecha_ejecucion}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_ejecucion: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{g.costo}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="$ 0"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.costo}
                  onChange={(e) => setForm((f) => ({ ...f, costo: formatCOPInput(e.target.value) }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{g.proveedor}</label>
                <ProveedorInput
                  value={form.proveedor}
                  onChange={(val) => setForm((f) => ({ ...f, proveedor: val }))}
                  placeholder={g.placeholderProveedor}
                  proveedoresHistoricos={proveedoresHistoricos}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{g.descripcionTrabajo}</label>
                <textarea
                  required
                  rows={3}
                  placeholder={g.placeholderDescripcion}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              {formError && (
                <div className="sm:col-span-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : g.guardarRegistro}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  {t.comun.cancelar}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Timeline - Layout horizontal profesional */}
      {gestiones.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {g.sinRegistros}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {gestiones.map((ges, idx) => (
            <Card key={ges.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                {editingId === ges.id ? (
                  <div className="p-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">{g.fechaEjecucion}</label>
                      <input
                        type="date"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editForm.fecha_ejecucion}
                        onChange={(e) => setEditForm((f) => ({ ...f, fecha_ejecucion: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">{g.costo}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="$ 0"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editForm.costo}
                        onChange={(e) => setEditForm((f) => ({ ...f, costo: formatCOPInput(e.target.value) }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium">{g.proveedor}</label>
                      <ProveedorInput
                        value={editForm.proveedor}
                        onChange={(val) => setEditForm((f) => ({ ...f, proveedor: val }))}
                        placeholder={g.placeholderProveedor}
                        proveedoresHistoricos={proveedoresHistoricos}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium">{g.descripcionTrabajo}</label>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editForm.descripcion}
                        onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-2">
                      <Button size="sm" disabled={editLoading} onClick={() => handleSaveEdit(ges.id)}>
                        {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.comun.guardar}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        {t.comun.cancelar}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                    {/* Columna izquierda: Info principal */}
                    <div className="md:col-span-7 lg:col-span-8 p-4 border-b md:border-b-0 md:border-r">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 rounded-full px-2 py-1 border border-blue-200">
                            #{gestiones.length - idx}
                          </span>
                          <span className="font-semibold text-sm">{formatDate(ges.fecha_ejecucion)}</span>
                          {ges.proveedor && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{ges.proveedor}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-green-700">{formatCOP(ges.costo)}</span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() => startEdit(ges)}
                            >
                              {t.comun.editar}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={deletingGestionId === ges.id}
                              onClick={() => handleDeleteGestion(ges.id)}
                            >
                              {deletingGestionId === ges.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Trash2 className="h-3 w-3" />
                              }
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg">{ges.descripcion}</p>
                    </div>

                    {/* Columna derecha: Adjuntos */}
                    <div className="md:col-span-5 lg:col-span-4 p-4 bg-slate-50/30">
                      <AdjuntosPanel
                        gestion={ges}
                        solicitudId={id}
                        onRefresh={fetchGestiones}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Total */}
          <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="flex items-center justify-between py-5 px-6">
              <div>
                <p className="font-bold text-green-800 text-lg">{g.totalGastado}</p>
                <p className="text-sm text-green-700">
                  {gestiones.length} {gestiones.length !== 1 ? g.registrosTotalesPlural : g.registrosTotales}
                </p>
              </div>
              <p className="text-3xl font-bold text-green-900">{formatCOP(totalGastado)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
