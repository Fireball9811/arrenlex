"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, Loader2, X, Check, Zap } from "lucide-react"
import type { PropiedadServicio } from "@/lib/types/database"

type Props = {
  propiedadId: string
}

const ESTRATO_OPCIONES = [1, 2, 3, 4, 5, 6]

const formatMonedaCOP = (valor: number): string => {
  if (!valor) return "—"
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor)
}

const FORM_VACIO = {
  nombre: "",
  referencia: "",
  pagina_web: "",
  telefono: "",
  pago_promedio: "",
  estrato: "",
  fecha_vencimiento: "",
}

type FormState = typeof FORM_VACIO

export function ServiciosPropiedad({ propiedadId }: Props) {
  const [servicios, setServicios] = useState<PropiedadServicio[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // null = cerrado, "nuevo" = formulario de creación, uuid = edición de ese servicio
  const [panelAbierto, setPanelAbierto] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VACIO)
  const [eliminando, setEliminando] = useState<string | null>(null)

  useEffect(() => {
    cargarServicios()
  }, [propiedadId])

  async function cargarServicios() {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/propiedades/${propiedadId}/servicios`)
      if (!res.ok) throw new Error("Error al cargar servicios")
      const data: PropiedadServicio[] = await res.json()
      setServicios(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setCargando(false)
    }
  }

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setPanelAbierto("nuevo")
    setError(null)
  }

  function abrirEditar(servicio: PropiedadServicio) {
    setForm({
      nombre: servicio.nombre,
      referencia: servicio.referencia ?? "",
      pagina_web: servicio.pagina_web ?? "",
      telefono: servicio.telefono ?? "",
      pago_promedio: servicio.pago_promedio ? String(servicio.pago_promedio) : "",
      estrato: servicio.estrato ? String(servicio.estrato) : "",
      fecha_vencimiento: servicio.fecha_vencimiento ?? "",
    })
    setPanelAbierto(servicio.id)
    setError(null)
  }

  function cerrarPanel() {
    setPanelAbierto(null)
    setForm(FORM_VACIO)
    setError(null)
  }

  function handleFormChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function buildPayload(f: FormState) {
    return {
      nombre: f.nombre.trim(),
      referencia: f.referencia.trim() || null,
      pagina_web: f.pagina_web.trim() || null,
      telefono: f.telefono.trim() || null,
      pago_promedio: f.pago_promedio ? Number(f.pago_promedio) : 0,
      estrato: f.estrato ? Number(f.estrato) : null,
      fecha_vencimiento: f.fecha_vencimiento || null,
    }
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) {
      setError("El nombre del servicio es requerido")
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const esNuevo = panelAbierto === "nuevo"
      const url = esNuevo
        ? `/api/propiedades/${propiedadId}/servicios`
        : `/api/propiedades/${propiedadId}/servicios/${panelAbierto}`
      const method = esNuevo ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Error al guardar")
      }

      await cargarServicios()
      cerrarPanel()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id: string) {
    setEliminando(id)
    setError(null)
    try {
      const res = await fetch(`/api/propiedades/${propiedadId}/servicios/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Error al eliminar")
      }
      setServicios((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar")
    } finally {
      setEliminando(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-yellow-500" />
          Servicios Públicos
        </CardTitle>
        {panelAbierto === null && (
          <Button size="sm" variant="outline" onClick={abrirNuevo}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {/* Formulario inline */}
        {panelAbierto !== null && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <p className="text-sm font-semibold">
              {panelAbierto === "nuevo" ? "Nuevo servicio" : "Editar servicio"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ej: Energía eléctrica"
                  value={form.nombre}
                  onChange={(e) => handleFormChange("nombre", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Referencia</label>
                <Input
                  placeholder="Número de referencia"
                  value={form.referencia}
                  onChange={(e) => handleFormChange("referencia", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Teléfono</label>
                <Input
                  placeholder="Teléfono de atención"
                  value={form.telefono}
                  onChange={(e) => handleFormChange("telefono", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Página web</label>
                <Input
                  placeholder="https://..."
                  value={form.pagina_web}
                  onChange={(e) => handleFormChange("pagina_web", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Pago promedio (COP)</label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.pago_promedio}
                  onChange={(e) => handleFormChange("pago_promedio", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Estrato</label>
                <select
                  value={form.estrato}
                  onChange={(e) => handleFormChange("estrato", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sin estrato</option>
                  {ESTRATO_OPCIONES.map((e) => (
                    <option key={e} value={e}>
                      Estrato {e}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Fecha de vencimiento</label>
                <Input
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={(e) => handleFormChange("fecha_vencimiento", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleGuardar} disabled={guardando}>
                {guardando ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
              <Button size="sm" variant="outline" onClick={cerrarPanel} disabled={guardando}>
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de servicios */}
        {cargando ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando servicios...</span>
          </div>
        ) : servicios.length === 0 && panelAbierto === null ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay servicios registrados. Haz clic en &ldquo;Agregar&rdquo; para comenzar.
          </p>
        ) : (
          <div className="space-y-2">
            {servicios.map((servicio) => (
              <div
                key={servicio.id}
                className="flex items-start justify-between gap-2 border rounded-lg px-3 py-2 text-sm"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-medium truncate">{servicio.nombre}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {servicio.referencia && (
                      <span>Ref: {servicio.referencia}</span>
                    )}
                    {servicio.telefono && (
                      <span>Tel: {servicio.telefono}</span>
                    )}
                    {servicio.estrato && (
                      <span>Estrato {servicio.estrato}</span>
                    )}
                    {servicio.pago_promedio > 0 && (
                      <span>{formatMonedaCOP(servicio.pago_promedio)} promedio</span>
                    )}
                    {servicio.fecha_vencimiento && (
                      <span>
                        Vence:{" "}
                        {new Date(servicio.fecha_vencimiento + "T00:00:00").toLocaleDateString(
                          "es-CO",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </span>
                    )}
                    {servicio.pagina_web && (
                      <a
                        href={servicio.pagina_web}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline truncate max-w-[160px]"
                      >
                        {servicio.pagina_web}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => abrirEditar(servicio)}
                    disabled={panelAbierto !== null || eliminando === servicio.id}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleEliminar(servicio.id)}
                    disabled={eliminando === servicio.id || panelAbierto !== null}
                  >
                    {eliminando === servicio.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
