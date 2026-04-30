"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, FileText, Mail, Trash2 } from "lucide-react"
import { useLang } from "@/lib/i18n/context"
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

type OtroGasto = {
  id: string
  propiedad_id: string
  user_id: string
  nombre_completo: string
  cedula: string
  tarjeta_profesional: string | null
  correo_electronico: string | null
  motivo_pago: string
  descripcion_trabajo: string
  fecha_realizacion: string
  valor: number
  banco: string | null
  referencia_pago: string | null
  numero_recibo: string
  fecha_emision: string
  estado: "pendiente" | "emitido" | "cancelado"
  created_at: string
  propiedades: {
    id: string
    direccion: string
    ciudad: string
    barrio: string
    titulo: string
  } | null
  users: {
    email: string
    nombre: string | null
  } | null
}

type PropiedadOption = { id: string; direccion: string; ciudad: string; titulo: string; user_id: string }

const STATUS_VALUES = ["pendiente", "emitido", "cancelado"] as const

export default function AdminOtrosGastosPage() {
  const { t } = useLang()
  const [gastos, setGastos] = useState<OtroGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>("todos")
  const [propiedades, setPropiedades] = useState<PropiedadOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Form state
  const [propiedadId, setPropiedadId] = useState("")
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [cedula, setCedula] = useState("")
  const [tarjetaProfesional, setTarjetaProfesional] = useState("")
  const [correoElectronico, setCorreoElectronico] = useState("")
  const [motivoPago, setMotivoPago] = useState("")
  const [descripcionTrabajo, setDescripcionTrabajo] = useState("")
  const [fechaRealizacion, setFechaRealizacion] = useState(new Date().toISOString().split('T')[0])
  const [valor, setValor] = useState("")
  const [banco, setBanco] = useState("")
  const [referenciaPago, setReferenciaPago] = useState("")

  const todayStr = new Date().toISOString().split("T")[0]

  const fetchGastos = useCallback(async () => {
    const res = await fetch("/api/otros-gastos")
    if (res.status === 403 || res.status === 401) {
      setGastos([])
      return
    }
    if (!res.ok) return
    const data = await res.json()
    setGastos(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    Promise.all([
      fetchGastos(),
      fetch("/api/propiedades")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: PropiedadOption[]) => {
          setPropiedades(Array.isArray(data) ? data : [])
        }),
    ]).finally(() => setLoading(false))
  }, [fetchGastos])

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormMessage(null)

    try {
      if (!propiedadId) {
        setFormMessage({ type: "error", text: "Selecciona una propiedad" })
        setFormLoading(false)
        return
      }

      const valorNum = parseFloat(valor)
      if (isNaN(valorNum) || valorNum <= 0) {
        setFormMessage({ type: "error", text: "El valor debe ser mayor a cero" })
        setFormLoading(false)
        return
      }

      const res = await fetch("/api/otros-gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propiedad_id: propiedadId,
          nombre_completo: nombreCompleto.trim(),
          cedula: cedula.trim(),
          tarjeta_profesional: tarjetaProfesional.trim() || null,
          correo_electronico: correoElectronico.trim() || null,
          motivo_pago: motivoPago.trim(),
          descripcion_trabajo: descripcionTrabajo.trim(),
          fecha_realizacion: fechaRealizacion,
          valor: valorNum,
          banco: banco.trim() || null,
          referencia_pago: referenciaPago.trim() || null,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setFormMessage({ type: "success", text: data.message || "Gasto registrado correctamente" })
        // Reset form
        setPropiedadId("")
        setNombreCompleto("")
        setCedula("")
        setTarjetaProfesional("")
        setCorreoElectronico("")
        setMotivoPago("")
        setDescripcionTrabajo("")
        setFechaRealizacion(todayStr)
        setValor("")
        setBanco("")
        setReferenciaPago("")
        fetchGastos()
        setTimeout(() => setShowForm(false), 1500)
      } else {
        setFormMessage({ type: "error", text: data.error || "Error al registrar el gasto" })
      }
    } catch {
      setFormMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/otros-gastos/${id}`, { method: "DELETE" })
    if (res.ok) {
      fetchGastos()
      setDeleteDialog({ open: false, id: null })
    }
  }

  const handleChangeStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/otros-gastos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newStatus }),
      })
      if (res.ok) await fetchGastos()
    } finally {
      setUpdatingId(null)
    }
  }

  const refPropiedad = (g: OtroGasto) => {
    const p = g.propiedades
    if (!p || typeof p !== "object") return g.propiedad_id
    return [p.direccion, p.ciudad].filter(Boolean).join(", ") || g.propiedad_id
  }

  const refPropietario = (g: OtroGasto) => {
    const u = g.users
    if (!u) return "—"
    return u.nombre || u.email || "—"
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  const formatValor = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const filteredGastos = gastos.filter((g) => {
    if (tab === "todos") return true
    return g.estado === tab
  })

  const totalGastado = filteredGastos.reduce((sum, g) => sum + (g.valor || 0), 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.otrosGastos.titulo}</h1>
        <p className="text-muted-foreground">{t.otrosGastos.descripcion}</p>
      </div>

      {!showForm ? (
        <div className="mb-6">
          <Button onClick={() => setShowForm(true)} variant="default">
            <DollarSign className="mr-2 h-4 w-4" />
            {t.otrosGastos.nuevoGasto}
          </Button>
        </div>
      ) : (
        <Card className="mb-6 max-w-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t.otrosGastos.nuevoGasto}</CardTitle>
              <CardDescription>{t.otrosGastos.cardDesc}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              {t.comun.cerrar}
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.propiedad}</label>
                <select
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={propiedadId}
                  onChange={(e) => setPropiedadId(e.target.value)}
                >
                  <option value="">{t.otrosGastos.form.seleccionaPropiedad}</option>
                  {propiedades.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.direccion, p.ciudad].filter(Boolean).join(", ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.nombreCompleto}</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    placeholder={t.otrosGastos.form.placeholderNombre}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.cedula}</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder={t.otrosGastos.form.placeholderCedula}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.tarjetaProfesional}</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={tarjetaProfesional}
                    onChange={(e) => setTarjetaProfesional(e.target.value)}
                    placeholder={t.otrosGastos.form.placeholderTarjeta}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.correoElectronico}</label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={correoElectronico}
                    onChange={(e) => setCorreoElectronico(e.target.value)}
                    placeholder={t.otrosGastos.form.placeholderCorreo}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.motivoPago}</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={motivoPago}
                    onChange={(e) => setMotivoPago(e.target.value)}
                    placeholder={t.otrosGastos.form.placeholderMotivo}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.valor}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.descripcionTrabajo}</label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={descripcionTrabajo}
                  onChange={(e) => setDescripcionTrabajo(e.target.value)}
                  placeholder={t.otrosGastos.form.placeholderDescripcion}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.fechaRealizacion}</label>
                  <input
                    type="date"
                    required
                    max={todayStr}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={fechaRealizacion}
                    onChange={(e) => setFechaRealizacion(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.banco}</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    placeholder={t.otrosGastos.form.placeholderBanco}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.referenciaPago}</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder={t.otrosGastos.form.placeholderReferencia}
                />
              </div>

              {formMessage && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    formMessage.type === "success"
                      ? "border border-green-200 bg-green-50 text-green-800"
                      : "border border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {formMessage.text}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? t.otrosGastos.guardando : t.otrosGastos.guardar}
                </Button>
                <Button type="button" variant="outline" disabled={formLoading} onClick={() => setShowForm(false)}>
                  {t.comun.cancelar}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.otrosGastos.titulo}</CardTitle>
            {filteredGastos.length > 0 && (
              <Badge variant="secondary" className="text-base">
                Total: {formatValor(totalGastado)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t.comun.cargando}</p>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full max-w-md grid-cols-4">
                <TabsTrigger value="todos">
                  Todos ({gastos.length})
                </TabsTrigger>
                <TabsTrigger value="pendiente">
                  {t.otrosGastos.estados.pendiente} ({gastos.filter((g) => g.estado === "pendiente").length})
                </TabsTrigger>
                <TabsTrigger value="emitido">
                  {t.otrosGastos.estados.emitido} ({gastos.filter((g) => g.estado === "emitido").length})
                </TabsTrigger>
                <TabsTrigger value="cancelado">
                  {t.otrosGastos.estados.cancelado} ({gastos.filter((g) => g.estado === "cancelado").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="mt-4">
                {filteredGastos.length === 0 ? (
                  <p className="py-8 text-muted-foreground">{t.otrosGastos.sinGastos}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.fecha}</th>
                          <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.recibo}</th>
                          <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.proveedor}</th>
                          <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.propiedad}</th>
                          <th className="p-2 text-left font-medium">Propietario</th>
                          <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.motivo}</th>
                          <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.valor}</th>
                          <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.estado}</th>
                          <th className="p-2 text-left font-medium">{t.otrosGastos.columnas.acciones}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGastos.map((g) => (
                          <tr key={g.id} className="border-b">
                            <td className="p-2 whitespace-nowrap">{formatDate(g.fecha_emision)}</td>
                            <td className="p-2 font-mono text-xs">{g.numero_recibo}</td>
                            <td className="p-2">
                              <div className="flex flex-col">
                                <span className="font-medium">{g.nombre_completo}</span>
                                <span className="text-xs text-muted-foreground">{g.cedula}</span>
                              </div>
                            </td>
                            <td className="max-w-[150px] truncate p-2" title={refPropiedad(g)}>
                              {refPropiedad(g)}
                            </td>
                            <td className="p-2 text-xs">{refPropietario(g)}</td>
                            <td className="p-2">{g.motivo_pago}</td>
                            <td className="p-2 font-medium">{formatValor(g.valor)}</td>
                            <td className="p-2">
                              <select
                                value={g.estado}
                                onChange={(e) => handleChangeStatus(g.id, e.target.value)}
                                disabled={updatingId === g.id}
                                className="rounded border bg-background px-2 py-1 text-sm"
                              >
                                {STATUS_VALUES.map((val) => (
                                  <option key={val} value={val}>
                                    {t.otrosGastos.estados[val as keyof typeof t.otrosGastos.estados]}
                                  </option>
                                ))}
                              </select>
                              {updatingId === g.id && (
                                <span className="ml-1 text-xs text-muted-foreground">{t.otrosGastos.guardando}</span>
                              )}
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <Link
                                  href={`/admin/otros-gastos/${g.id}`}
                                  className="inline-flex items-center rounded border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                                >
                                  <FileText className="h-3 w-3" />
                                </Link>
                                {g.correo_electronico && g.estado === "emitido" && (
                                  <button
                                    className="inline-flex items-center rounded border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                                    title={t.otrosGastos.enviarRecibo}
                                  >
                                    <Mail className="h-3 w-3" />
                                  </button>
                                )}
                                {g.estado === "pendiente" && (
                                  <button
                                    className="inline-flex items-center rounded border px-2 py-1 text-xs font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                    onClick={() => setDeleteDialog({ open: true, id: g.id })}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.otrosGastos.confirmarEliminar}</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar este registro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.comun.cancelar}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.id && handleDelete(deleteDialog.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.comun.eliminar}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
