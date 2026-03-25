"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import type { SolicitudMantenimientoConPropiedad } from "@/lib/types/database"
import type { UserRole } from "@/lib/auth/role"
import { useLang } from "@/lib/i18n/context"

const STATUS_MANT_VALUES = ["pendiente", "ejecucion", "completado"] as const

type PropiedadOption = { id: string; direccion: string; ciudad: string; barrio: string }

export default function MantenimientoPage() {
  const { t } = useLang()
  const [solicitudes, setSolicitudes] = useState<SolicitudMantenimientoConPropiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)
  const [tab, setTab] = useState<string>("pendiente")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Form (inquilino y admin/propietario)
  const [propiedades, setPropiedades] = useState<PropiedadOption[]>([])
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [detalle, setDetalle] = useState("")
  const [desdeCuando, setDesdeCuando] = useState("")
  const [propiedadId, setPropiedadId] = useState("")
  const [formLoading, setFormLoading] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showFormAdminProp, setShowFormAdminProp] = useState(false)

  const fetchSolicitudes = useCallback(async () => {
    const res = await fetch("/api/mantenimiento")
    if (res.status === 403 || res.status === 401) {
      setSolicitudes([])
      return
    }
    if (!res.ok) return
    const data = await res.json()
    setSolicitudes(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { role?: UserRole } | null) => {
        const r = data?.role ?? null
        setRole(r)
      })
      .catch(() => setRole(null))
  }, [])

  useEffect(() => {
    if (role === "admin" || role === "propietario") {
      fetchSolicitudes().finally(() => setLoading(false))
    } else if (role === "inquilino") {
      setLoading(false)
    }
  }, [role, fetchSolicitudes])

  useEffect(() => {
    if (role === "inquilino") {
      fetch("/api/mantenimiento/propiedades-inquilino")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: PropiedadOption[]) => {
          setPropiedades(Array.isArray(data) ? data : [])
          if (data?.length === 1) setPropiedadId(data[0].id)
        })
        .catch(() => setPropiedades([]))
    }
    if (role === "admin" || role === "propietario") {
      fetch("/api/propiedades")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: PropiedadOption[]) => {
          setPropiedades(Array.isArray(data) ? data : [])
          if (data?.length === 1) setPropiedadId(data[0].id)
        })
        .catch(() => setPropiedades([]))
    }
  }, [role])

  const handleChangeStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/mantenimiento/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) await fetchSolicitudes()
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormMessage(null)
    try {
      const body: Record<string, string> = {
        nombre_completo: nombreCompleto.trim(),
        detalle: detalle.trim(),
        desde_cuando: desdeCuando.trim(),
      }
      if (role === "admin" || role === "propietario") {
        if (!propiedadId) {
          setFormMessage({ type: "error", text: "Selecciona una propiedad" })
          setFormLoading(false)
          return
        }
        body.propiedad_id = propiedadId
      } else if (propiedades.length > 1 && propiedadId) {
        body.propiedad_id = propiedadId
      }
      const res = await fetch("/api/mantenimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        const emailSent = data.emailSent !== false
        setFormMessage({
          type: emailSent ? "success" : "error",
          text: data.message || "Solicitud enviada correctamente",
        })
        setNombreCompleto("")
        setDetalle("")
        setDesdeCuando("")
        if (propiedades.length > 1 || role === "admin" || role === "propietario") setPropiedadId("")
        if (role === "admin" || role === "propietario") {
          fetchSolicitudes()
          setShowFormAdminProp(false)
        }
      } else {
        setFormMessage({ type: "error", text: data.error || "Error al enviar la solicitud" })
      }
    } catch {
      setFormMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setFormLoading(false)
    }
  }

  const refPropiedad = (s: SolicitudMantenimientoConPropiedad) => {
    const raw = s.propiedades
    const p = raw ? (Array.isArray(raw) ? raw[0] : raw) : null
    if (!p || typeof p !== "object") return s.propiedad_id
    const d = (p as { direccion?: string; ciudad?: string }).direccion
    const c = (p as { direccion?: string; ciudad?: string }).ciudad
    return [d, c].filter(Boolean).join(", ") || s.propiedad_id
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const diasDesde = (dateStr: string): string => {
    if (!dateStr) return "—"
    try {
      const fecha = new Date(dateStr)
      if (isNaN(fecha.getTime())) return dateStr
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      fecha.setHours(0, 0, 0, 0)
      const diff = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
      if (diff < 0) return "0 días"
      if (diff === 0) return "Hoy"
      if (diff === 1) return "1 día"
      return `${diff} días`
    } catch {
      return dateStr
    }
  }

  const todayStr = new Date().toISOString().split("T")[0]

  if (role === null) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t.comun.cargando}</p>
      </div>
    )
  }

  if (role === "inquilino") {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t.mantenimiento.titulo}</h1>
          <p className="text-muted-foreground">
            {t.mantenimiento.descripcionInquilino}
          </p>
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{t.mantenimiento.cardTitulo}</CardTitle>
            <CardDescription>
              {t.mantenimiento.cardDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.mantenimiento.nombreCompleto}</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder={t.mantenimiento.placeholderNombre}
                />
              </div>
              {propiedades.length > 1 && (
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.mantenimiento.propiedad}</label>
                  <select
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={propiedadId}
                    onChange={(e) => setPropiedadId(e.target.value)}
                  >
                    <option value="">{t.mantenimiento.seleccionaPropiedad}</option>
                    {propiedades.map((p) => (
                      <option key={p.id} value={p.id}>
                        {[p.direccion, p.ciudad].filter(Boolean).join(", ")}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">{t.mantenimiento.detalle}</label>
                <textarea
                  required
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  placeholder={t.mantenimiento.placeholderDetalle}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.mantenimiento.desdeCuando}</label>
                <input
                  type="date"
                  required
                  max={todayStr}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={desdeCuando}
                  onChange={(e) => setDesdeCuando(e.target.value)}
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
              <Button type="submit" disabled={formLoading}>
                {formLoading ? t.mantenimiento.enviando : t.mantenimiento.enviar}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.mantenimiento.titulo}</h1>
        <p className="text-muted-foreground">
          {t.mantenimiento.descripcionAdmin}
        </p>
      </div>

      {!showFormAdminProp ? (
        <div className="mb-6">
          <Button onClick={() => setShowFormAdminProp(true)} variant="default">
            {t.mantenimiento.nuevaSolicitud}
          </Button>
        </div>
      ) : (
        <Card className="mb-6 max-w-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t.mantenimiento.nuevaSolicitud}</CardTitle>
              <CardDescription>
                {t.mantenimiento.cardDescAdmin}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowFormAdminProp(false)}>
              {t.comun.cerrar}
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.mantenimiento.propiedad}</label>
                <select
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={propiedadId}
                  onChange={(e) => setPropiedadId(e.target.value)}
                >
                  <option value="">{t.mantenimiento.seleccionaPropiedad}</option>
                  {propiedades.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.direccion, p.ciudad].filter(Boolean).join(", ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.mantenimiento.nombreCompleto}</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder={t.mantenimiento.placeholderNombreAdmin}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.mantenimiento.detalle}</label>
                <textarea
                  required
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  placeholder={t.mantenimiento.placeholderDetalle}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.mantenimiento.desdeCuando}</label>
                <input
                  type="date"
                  required
                  max={todayStr}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={desdeCuando}
                  onChange={(e) => setDesdeCuando(e.target.value)}
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
                  {formLoading ? t.mantenimiento.enviando : t.mantenimiento.enviar}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={formLoading}
                  onClick={() => setShowFormAdminProp(false)}
                >
                  {t.mantenimiento.cancelar}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.mantenimiento.cardTitulo}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t.comun.cargando}</p>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="pendiente">
                  {t.mantenimiento.estados.pendiente} ({solicitudes.filter((s) => s.status === "pendiente").length})
                </TabsTrigger>
                <TabsTrigger value="ejecucion">
                  {t.mantenimiento.estados.ejecucion} ({solicitudes.filter((s) => s.status === "ejecucion").length})
                </TabsTrigger>
                <TabsTrigger value="completado">
                  {t.mantenimiento.estados.completado} ({solicitudes.filter((s) => s.status === "completado").length})
                </TabsTrigger>
              </TabsList>

              {STATUS_MANT_VALUES.map((value) => {
                const filtered = solicitudes.filter((s) => s.status === value)
                return (
                <TabsContent key={value} value={value} className="mt-4">
                  {filtered.length === 0 ? (
                    <p className="py-8 text-muted-foreground">{t.mantenimiento.sinSolicitudes}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="p-2 text-left font-medium">{t.mantenimiento.columnas.nombre}</th>
                            <th className="p-2 text-left font-medium">{t.mantenimiento.columnas.propiedad}</th>
                            <th className="p-2 text-left font-medium">{t.mantenimiento.columnas.detalle}</th>
                            <th className="p-2 text-left font-medium">{t.mantenimiento.columnas.desdeCuando}</th>
                            <th className="p-2 text-left font-medium">{t.mantenimiento.columnas.responsable}</th>
                            <th className="p-2 text-left font-medium">{t.mantenimiento.columnas.fecha}</th>
                            <th className="p-2 text-left font-medium">{t.mantenimiento.columnas.estado}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((s) => (
                            <tr key={s.id} className="border-b">
                              <td className="p-2">{s.nombre_completo}</td>
                              <td className="max-w-[200px] truncate p-2" title={refPropiedad(s)}>
                                {refPropiedad(s)}
                              </td>
                              <td className="max-w-[200px] truncate p-2" title={s.detalle}>
                                {s.detalle || "—"}
                              </td>
                              <td className="p-2">{diasDesde(s.desde_cuando)}</td>
                              <td className="p-2">{s.responsable || "—"}</td>
                              <td className="p-2">{formatDate(s.created_at)}</td>
                              <td className="p-2">
                                <select
                                  value={s.status}
                                  onChange={(e) => handleChangeStatus(s.id, e.target.value)}
                                  disabled={updatingId === s.id}
                                  className="rounded border bg-background px-2 py-1 text-sm"
                                >
                                  {STATUS_MANT_VALUES.map((val) => (
                                    <option key={val} value={val}>
                                      {t.mantenimiento.estados[val as keyof typeof t.mantenimiento.estados]}
                                    </option>
                                  ))}
                                </select>
                                {updatingId === s.id && (
                                  <span className="ml-1 text-xs text-muted-foreground">{t.mantenimiento.guardando}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
                )
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
