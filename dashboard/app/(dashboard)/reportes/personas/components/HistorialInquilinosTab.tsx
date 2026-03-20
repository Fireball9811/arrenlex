"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserX, Calendar, Mail, Phone, CheckCircle, XCircle, FileX, Pencil, Power, Trash2 } from "lucide-react"

interface InquilinoInactivo {
  id: string
  nombre: string
  cedula: string
  email?: string | null
  celular?: string | null
  creado_en: string
  tieneUsuario: boolean
  tieneContrato: boolean
  estadoContrato?: string | null
  user_id?: string | null
  activo?: boolean
  bloqueado?: boolean
}

export function HistorialInquilinosTab() {
  const [inquilinos, setInquilinos] = useState<InquilinoInactivo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInquilinosInactivos()
  }, [])

  async function fetchInquilinosInactivos() {
    setLoading(true)
    try {
      const res = await fetch("/api/reportes/inquilinos-inactivos")
      const data = await res.json()
      setInquilinos(data)
    } catch (error) {
      console.error("Error fetching inquilinos inactivos:", error)
    } finally {
      setLoading(false)
    }
  }

  function toggleActivo(inquilino: InquilinoInactivo) {
    if (!inquilino.user_id) return

    const accion = inquilino.activo ? "desactivar" : "activar"
    if (!confirm(inquilino.activo
      ? `¿Desactivar a ${inquilino.nombre || inquilino.email}?`
      : `¿Activar a ${inquilino.nombre || inquilino.email}?`)) return

    fetch(`/api/admin/usuarios/${inquilino.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else fetchInquilinosInactivos()
      })
      .catch((err) => alert("Error: " + err))
  }

  function toggleBloqueo(inquilino: InquilinoInactivo) {
    if (!inquilino.user_id) return

    const accion = inquilino.bloqueado ? "desbloquear" : "bloquear"
    if (!confirm(inquilino.bloqueado
      ? `¿Desbloquear a ${inquilino.nombre || inquilino.email}?`
      : `¿Bloquear a ${inquilino.nombre || inquilino.email}?`)) return

    fetch(`/api/admin/usuarios/${inquilino.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else fetchInquilinosInactivos()
      })
      .catch((err) => alert("Error: " + err))
  }

  function eliminarUsuario(inquilino: InquilinoInactivo) {
    if (!inquilino.user_id) return
    if (!confirm(`¿Eliminar a ${inquilino.nombre || inquilino.email}? Esta acción no se puede deshacer.`)) return

    fetch(`/api/admin/usuarios/${inquilino.user_id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else {
          alert("Usuario eliminado exitosamente")
          fetchInquilinosInactivos()
        }
      })
      .catch((err) => alert("Error: " + err))
  }

  const getEstadoLabel = (estado: string | null | undefined, tieneContrato: boolean) => {
    if (!tieneContrato) return { label: "Sin contrato", color: "bg-gray-100 text-gray-800" }
    if (estado === "terminado") return { label: "Terminado", color: "bg-red-100 text-red-800" }
    if (estado === "vencido") return { label: "Vencido", color: "bg-orange-100 text-orange-800" }
    return { label: estado || "Inactivo", color: "bg-gray-100 text-gray-800" }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Inquilinos Inactivos</h2>
        <p className="text-muted-foreground">Arrendatarios sin contrato o con contrato inactivo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inquilinos Inactivos ({inquilinos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : inquilinos.length === 0 ? (
            <p className="text-muted-foreground">No hay inquilinos inactivos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Arrendatario</th>
                    <th className="p-3 text-left">Cédula</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Celular</th>
                    <th className="p-3 text-left">Fecha registro</th>
                    <th className="p-3 text-center">Estado Contrato</th>
                    <th className="p-3 text-center">Usuario</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inquilinos.map((i) => {
                    const estadoInfo = getEstadoLabel(i.estadoContrato ?? null, i.tieneContrato)
                    return (
                      <tr key={i.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <UserX className="h-4 w-4 text-amber-600" />
                            <span className="font-medium">{i.nombre || "Sin nombre"}</span>
                          </div>
                        </td>
                        <td className="p-3">{i.cedula || "—"}</td>
                        <td className="p-3">
                          {i.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a href={`mailto:${i.email}`} className="hover:underline text-blue-600">
                                {i.email}
                              </a>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="p-3">
                          {i.celular ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a href={`tel:${i.celular}`} className="hover:underline text-blue-600">
                                {i.celular}
                              </a>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(i.creado_en).toLocaleDateString("es-CO")}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${estadoInfo.color} flex items-center gap-1 w-fit mx-auto`}>
                            {i.tieneContrato ? <FileX className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {estadoInfo.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {i.tieneUsuario ? (
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 flex items-center gap-1 w-fit mx-auto">
                              <CheckCircle className="h-3 w-3" /> Sí
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800 flex items-center gap-1 w-fit mx-auto">
                              <XCircle className="h-3 w-3" /> No
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Editar arrendatario */}
                            <Link href={`/reportes/personas/arrendatarios/${i.id}`}>
                              <Button size="sm" variant="outline" title="Editar arrendatario">
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </Link>
                            {/* Botones de usuario - solo si tiene usuario */}
                            {i.tieneUsuario && (
                              <>
                                {/* Activo/Inactivar */}
                                <Button
                                  size="sm"
                                  variant={i.activo ? "outline" : "default"}
                                  onClick={() => toggleActivo(i)}
                                  title={i.activo ? "Desactivar" : "Activar"}
                                >
                                  <Power className="h-3 w-3" />
                                </Button>
                                {/* Bloquear/Desbloquear */}
                                <Button
                                  size="sm"
                                  variant={i.bloqueado ? "outline" : "destructive"}
                                  onClick={() => toggleBloqueo(i)}
                                  title={i.bloqueado ? "Desbloquear" : "Bloquear"}
                                >
                                  {i.bloqueado ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                </Button>
                                {/* Eliminar */}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => eliminarUsuario(i)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
