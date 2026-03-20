"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Pencil, Building2, Trash2, CheckCircle, XCircle, Power } from "lucide-react"
import type { Perfil } from "@/lib/types/database"
import type { Propiedad } from "@/lib/types/database"

interface PropietarioConPropiedades extends Perfil {
  propiedades?: Propiedad[]
  propiedades_count?: number
}

export function PropietariosTab() {
  const [propietarios, setPropietarios] = useState<PropietarioConPropiedades[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Modal de edición
  const [editingPropietario, setEditingPropietario] = useState<PropietarioConPropiedades | null>(null)
  const [editFormData, setEditFormData] = useState({
    nombre: "",
    celular: "",
    cedula: "",
    cedula_lugar_expedicion: "",
    direccion: "",
    activo: true,
    cuenta_bancaria_1_entidad: "",
    cuenta_bancaria_1_numero: "",
    cuenta_bancaria_1_tipo: "ahorros",
    cuenta_bancaria_2_entidad: "",
    cuenta_bancaria_2_numero: "",
    cuenta_bancaria_2_tipo: "ahorros",
    llave_bancaria_1: "",
    llave_bancaria_2: "",
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editMessage, setEditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [propiedadesDisponibles, setPropiedadesDisponibles] = useState<Propiedad[]>([])
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState("")

  useEffect(() => {
    fetchPropietarios()
  }, [])

  async function fetchPropietarios() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/propietarios")
      const data = await res.json()
      setPropietarios(data || [])
    } catch (error) {
      console.error("Error fetching propietarios:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPropiedadesDisponibles() {
    try {
      const res = await fetch("/api/propiedades")
      const data: Propiedad[] = await res.json()
      if (editingPropietario) {
        const disponibles = data.filter((p) => p.user_id !== editingPropietario.id)
        setPropiedadesDisponibles(disponibles)
      }
    } catch (error) {
      console.error("Error fetching propiedades:", error)
    }
  }

  function toggleActivo(propietario: Perfil) {
    const accion = propietario.activo ? "desactivar" : "activar"
    if (!confirm(propietario.activo
      ? `¿Desactivar a ${propietario.nombre || propietario.email}?`
      : `¿Activar a ${propietario.nombre || propietario.email}?`)) return

    fetch(`/api/admin/usuarios/${propietario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else fetchPropietarios()
      })
      .catch((err) => alert("Error: " + err))
  }

  function toggleBloqueo(propietario: Perfil) {
    const accion = propietario.bloqueado ? "desbloquear" : "bloquear"
    if (!confirm(propietario.bloqueado
      ? `¿Desbloquear a ${propietario.nombre || propietario.email}?`
      : `¿Bloquear a ${propietario.nombre || propietario.email}?`)) return

    fetch(`/api/admin/usuarios/${propietario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else fetchPropietarios()
      })
      .catch((err) => alert("Error: " + err))
  }

  function eliminarUsuario(propietario: Perfil) {
    if (!confirm(`¿Eliminar a ${propietario.nombre || propietario.email}? Esta acción no se puede deshacer.`)) return

    fetch(`/api/admin/usuarios/${propietario.id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else {
          alert("Usuario eliminado exitosamente")
          fetchPropietarios()
        }
      })
      .catch((err) => alert("Error: " + err))
  }

  async function openEditModal(propietario: PropietarioConPropiedades) {
    setEditingPropietario(propietario)
    setEditFormData({
      nombre: propietario.nombre || "",
      celular: propietario.celular || "",
      cedula: propietario.cedula || "",
      cedula_lugar_expedicion: propietario.cedula_lugar_expedicion || "",
      direccion: propietario.direccion || "",
      activo: propietario.activo,
      cuenta_bancaria_1_entidad: propietario.cuenta_bancaria_1_entidad || "",
      cuenta_bancaria_1_numero: propietario.cuenta_bancaria_1_numero || "",
      cuenta_bancaria_1_tipo: propietario.cuenta_bancaria_1_tipo || "ahorros",
      cuenta_bancaria_2_entidad: propietario.cuenta_bancaria_2_entidad || "",
      cuenta_bancaria_2_numero: propietario.cuenta_bancaria_2_numero || "",
      cuenta_bancaria_2_tipo: propietario.cuenta_bancaria_2_tipo || "ahorros",
      llave_bancaria_1: propietario.llave_bancaria_1 || "",
      llave_bancaria_2: propietario.llave_bancaria_2 || "",
    })
    setEditMessage(null)

    try {
      const res = await fetch(`/api/admin/propietarios/${propietario.id}/propiedades`)
      const data: Propiedad[] = await res.json()
      setEditingPropietario({ ...propietario, propiedades: data })
    } catch (error) {
      console.error("Error fetching propiedades del propietario:", error)
    }

    await fetchPropiedadesDisponibles()
  }

  function closeEditModal() {
    setEditingPropietario(null)
    setPropiedadSeleccionada("")
    setEditMessage(null)
  }

  async function actualizarPropietario(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPropietario) return

    setEditSubmitting(true)
    setEditMessage(null)

    try {
      await fetch(`/api/admin/usuarios/${editingPropietario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_datos_personales",
          nombre: editFormData.nombre,
          celular: editFormData.celular,
          cedula: editFormData.cedula,
          cedula_lugar_expedicion: editFormData.cedula_lugar_expedicion,
          direccion: editFormData.direccion,
          activo: editFormData.activo,
        }),
      })

      await fetch(`/api/admin/usuarios/${editingPropietario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_datos_bancarios",
          cuenta_bancaria_1_entidad: editFormData.cuenta_bancaria_1_entidad || null,
          cuenta_bancaria_1_numero: editFormData.cuenta_bancaria_1_numero || null,
          cuenta_bancaria_1_tipo: editFormData.cuenta_bancaria_1_tipo || null,
          cuenta_bancaria_2_entidad: editFormData.cuenta_bancaria_2_entidad || null,
          cuenta_bancaria_2_numero: editFormData.cuenta_bancaria_2_numero || null,
          cuenta_bancaria_2_tipo: editFormData.cuenta_bancaria_2_tipo || null,
          llave_bancaria_1: editFormData.llave_bancaria_1 || null,
          llave_bancaria_2: editFormData.llave_bancaria_2 || null,
        }),
      })

      setEditMessage({ type: "success", text: "Propietario actualizado exitosamente" })
      fetchPropietarios()
      setTimeout(() => closeEditModal(), 1500)
    } catch (err) {
      setEditMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setEditSubmitting(false)
    }
  }

  async function asignarPropiedad() {
    if (!editingPropietario || !propiedadSeleccionada) return

    try {
      const res = await fetch(`/api/admin/propietarios/${editingPropietario.id}/propiedades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedadId: propiedadSeleccionada }),
      })

      if (res.ok) {
        const resProps = await fetch(`/api/admin/propietarios/${editingPropietario.id}/propiedades`)
        const data: Propiedad[] = await resProps.json()
        setEditingPropietario({ ...editingPropietario, propiedades: data })
        await fetchPropiedadesDisponibles()
        setPropiedadSeleccionada("")
      } else {
        const data = await res.json()
        alert(data.error || "Error al asignar propiedad")
      }
    } catch (err) {
      alert("Error: " + err)
    }
  }

  async function quitarPropiedad(propiedadId: string) {
    if (!editingPropietario) return
    if (!confirm("¿Estás seguro de quitar esta propiedad del propietario?")) return

    try {
      const res = await fetch(`/api/admin/propietarios/${editingPropietario.id}/propiedades?propiedadId=${propiedadId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        const resProps = await fetch(`/api/admin/propietarios/${editingPropietario.id}/propiedades`)
        const data: Propiedad[] = await resProps.json()
        setEditingPropietario({ ...editingPropietario, propiedades: data })
        await fetchPropiedadesDisponibles()
      } else {
        const data = await res.json()
        alert(data.error || "Error al quitar propiedad")
      }
    } catch (err) {
      alert("Error: " + err)
    }
  }

  const filteredPropietarios = propietarios.filter((p) =>
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cedula?.includes(searchTerm)
  )

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Propietarios</h2>
          <p className="text-muted-foreground">Gestiona los propietarios de inmuebles</p>
        </div>
        <Button onClick={() => window.location.href = "/admin/usuarios?create=true&role=propietario"}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Propietario
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre, email o cédula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Lista de Propietarios ({filteredPropietarios.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredPropietarios.length === 0 ? (
            <p className="text-muted-foreground">No se encontraron propietarios</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Propietario</th>
                    <th className="p-3 text-left">Cédula</th>
                    <th className="p-3 text-left">Celular</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Propiedades</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPropietarios.map((p) => (
                    <tr key={p.id} className={`border-b ${p.bloqueado ? "bg-red-50" : ""}`}>
                      <td className="p-3">
                        <p className="font-medium">{p.nombre || "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </td>
                      <td className="p-3">{p.cedula || "—"}</td>
                      <td className="p-3">{p.celular || "—"}</td>
                      <td className="p-3 text-center">
                        {p.bloqueado ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Bloqueado</span>
                        ) : p.activo ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Activo</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Inactivo</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                          <Building2 className="inline h-3 w-3 mr-1" />
                          {p.propiedades_count ?? 0}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Editar */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(p)}
                            title="Editar"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {/* Activo/Inactivar */}
                          <Button
                            size="sm"
                            variant={p.activo ? "outline" : "default"}
                            onClick={() => toggleActivo(p)}
                            title={p.activo ? "Desactivar" : "Activar"}
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                          {/* Bloquear/Desbloquear */}
                          <Button
                            size="sm"
                            variant={p.bloqueado ? "outline" : "destructive"}
                            onClick={() => toggleBloqueo(p)}
                            title={p.bloqueado ? "Desbloquear" : "Bloquear"}
                          >
                            {p.bloqueado ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          </Button>
                          {/* Eliminar */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => eliminarUsuario(p)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición simplificado */}
      {editingPropietario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader>
              <CardTitle>Editar Propietario</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={actualizarPropietario} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Correo electrónico</Label>
                    <Input type="email" disabled value={editingPropietario.email} className="bg-muted" />
                  </div>
                  <div>
                    <Label>Nombre completo *</Label>
                    <Input
                      type="text"
                      value={editFormData.nombre}
                      onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Cédula</Label>
                    <Input
                      type="text"
                      value={editFormData.cedula}
                      onChange={(e) => setEditFormData({ ...editFormData, cedula: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Celular</Label>
                    <Input
                      type="text"
                      value={editFormData.celular}
                      onChange={(e) => setEditFormData({ ...editFormData, celular: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Dirección</Label>
                    <Input
                      type="text"
                      value={editFormData.direccion}
                      onChange={(e) => setEditFormData({ ...editFormData, direccion: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="activo"
                      checked={editFormData.activo}
                      onChange={(e) => setEditFormData({ ...editFormData, activo: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    <Label htmlFor="activo">Propietario activo</Label>
                  </div>
                </div>

                {editMessage && (
                  <div className={`p-3 rounded-lg ${
                    editMessage.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                  }`}>
                    {editMessage.text}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={editSubmitting}>
                    {editSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeEditModal}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
