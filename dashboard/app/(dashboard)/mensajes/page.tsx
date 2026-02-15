"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SolicitudVisitaConPropiedad } from "@/lib/types/database"
import type { UserRole } from "@/lib/auth/role"

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "contestado", label: "Contestado" },
  { value: "esperando", label: "Esperando" },
] as const

export default function MensajesPage() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<SolicitudVisitaConPropiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)
  const [tab, setTab] = useState<string>("pendiente")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchSolicitudes = useCallback(async () => {
    const res = await fetch("/api/solicitudes-visita")
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
        if (r === "inquilino") {
          router.replace("/dashboard")
          return
        }
      })
      .catch(() => setRole(null))
  }, [router])

  useEffect(() => {
    if (role === "admin" || role === "propietario") {
      fetchSolicitudes().finally(() => setLoading(false))
    } else if (role === "inquilino") {
      setLoading(false)
    }
  }, [role, fetchSolicitudes])

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

  const filtered = solicitudes.filter((s) => s.status === tab)
  const refPropiedad = (s: SolicitudVisitaConPropiedad) => {
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
          Solicitudes de visita a propiedades. Cambia el estado según gestiones cada mensaje.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de visita</CardTitle>
        </CardHeader>
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
                                <td className="p-2 max-w-[200px] truncate" title={refPropiedad(s)}>
                                  {refPropiedad(s)}
                                </td>
                                <td className="p-2 max-w-[180px] truncate" title={s.nota ?? ""}>
                                  {s.nota || "—"}
                                </td>
                                <td className="p-2">{formatDate(s.created_at)}</td>
                                <td className="p-2">
                                  <select
                                    value={s.status}
                                    onChange={(e) => handleChangeStatus(s.id, e.target.value)}
                                    disabled={updatingId === s.id}
                                    className="rounded border bg-background px-2 py-1 text-sm"
                                  >
                                    {STATUS_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
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
    </div>
  )
}
