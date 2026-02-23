"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Pencil } from "lucide-react"

interface Usuario {
  id: string
  email: string
  role: "admin" | "propietario" | "inquilino" | "maintenance_special" | "insurance_special" | "lawyer_special"
  nombre?: string
  activo: boolean
  bloqueado: boolean
  creado_en: string
}

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "propietario", label: "Propietario" },
  { value: "inquilino", label: "Inquilino" },
  { value: "maintenance_special", label: "Mantenimiento (Especial)" },
  { value: "insurance_special", label: "Seguros (Especial)" },
  { value: "lawyer_special", label: "Legal (Especial)" },
] as const

export function UsuariosSistemaTab() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Formulario de edición
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [editFormData, setEditFormData] = useState({
    nombre: "",
    role: "inquilino",
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editMessage, setEditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchUsuarios()
  }, [])

  async function fetchUsuarios() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/usuarios")
      const data = await res.json()
      setUsuarios(data || [])
    } catch (error) {
      console.error("Error fetching usuarios:", error)
    } finally {
      setLoading(false)
    }
  }

  function toggleActivo(usuario: Usuario) {
    const accion = usuario.activo ? "desactivar" : "activar"
    fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else fetchUsuarios()
      })
      .catch((err) => alert("Error: " + err))
  }

  function toggleBloqueo(usuario: Usuario) {
    const accion = usuario.bloqueado ? "desbloquear" : "bloquear"
    if (!confirm(usuario.bloqueado ? `Desbloquear a ${usuario.email}?` : `Bloquear a ${usuario.email}?`)) return
    fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else {
          alert(data.mensaje || "Listo")
          fetchUsuarios()
        }
      })
      .catch((err) => alert("Error: " + err))
  }

  function openEditModal(usuario: Usuario) {
    setEditingUser(usuario)
    setEditFormData({
      nombre: usuario.nombre || "",
      role: usuario.role,
    })
    setEditMessage(null)
  }

  function closeEditModal() {
    setEditingUser(null)
    setEditFormData({ nombre: "", role: "inquilino" })
    setEditMessage(null)
  }

  async function actualizarUsuario(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    setEditSubmitting(true)
    setEditMessage(null)

    try {
      const res = await fetch(`/api/admin/usuarios/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      })

      const data = await res.json()

      if (res.ok) {
        setEditMessage({ type: "success", text: "Usuario actualizado exitosamente" })
        fetchUsuarios()
        setTimeout(() => closeEditModal(), 1500)
      } else {
        setEditMessage({ type: "error", text: data.error || "Error al actualizar usuario" })
      }
    } catch (err) {
      setEditMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setEditSubmitting(false)
    }
  }

  const roleClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-800"
      case "propietario": return "bg-blue-100 text-blue-800"
      case "inquilino": return "bg-green-100 text-green-800"
      case "maintenance_special": return "bg-orange-100 text-orange-800"
      case "insurance_special": return "bg-cyan-100 text-cyan-800"
      case "lawyer_special": return "bg-indigo-100 text-indigo-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const roleLabel = (role: string) => {
    const found = ROLES.find(r => r.value === role)
    return found?.label || role
  }

  const filteredUsuarios = usuarios.filter((u) =>
    u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      {/* Header con búsqueda y botón de nuevo */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usuarios del Sistema</h2>
          <p className="text-muted-foreground">Gestiona todos los usuarios registrados</p>
        </div>
        <Button onClick={() => window.location.href = "/admin/usuarios?create=true"}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader><CardTitle>Lista de Usuarios ({filteredUsuarios.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Usuario</th>
                    <th className="p-3 text-left">Rol</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Activar/Inactivar</th>
                    <th className="p-3 text-center">Editar</th>
                    <th className="p-3 text-center">Bloquear</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsuarios.map((u) => (
                    <tr key={u.id} className={`border-b ${u.bloqueado ? "bg-red-50" : ""}`}>
                      <td className="p-3">
                        <p className="font-medium">{u.nombre || "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="p-3">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${roleClass(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {u.bloqueado ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Bloqueado</span>
                        ) : u.activo ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Activo</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Inactivo</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={u.activo && !u.bloqueado}
                          disabled={u.bloqueado}
                          onChange={() => toggleActivo(u)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(u)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant={u.bloqueado ? "outline" : "destructive"}
                          onClick={() => toggleBloqueo(u)}
                        >
                          {u.bloqueado ? "Desbloquear" : "Bloquear"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Editar Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={actualizarUsuario} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    disabled
                    value={editingUser.email}
                    className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">El correo no se puede modificar</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    placeholder="Juan Pérez García"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editFormData.nombre}
                    onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Rol *
                  </label>
                  <select
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {editMessage && (
                  <div
                    className={`p-3 rounded-lg ${
                      editMessage.type === "success"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {editMessage.text}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={editSubmitting}>
                    {editSubmitting ? "Guardando..." : "Guardar Cambios"}
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
