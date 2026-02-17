"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Usuario {
  id: string
  email: string
  role: "admin" | "propietario" | "inquilino"
  nombre?: string | null
  activo: boolean
  bloqueado: boolean
  creado_en: string
  celular?: string | null
  cedula?: string | null
  cedula_lugar_expedicion?: string | null
  direccion?: string | null
}

const ROLES: { value: Usuario["role"]; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "propietario", label: "Propietario" },
  { value: "inquilino", label: "Inquilino" },
]

export default function UsuariosSistemaPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [editForm, setEditForm] = useState({
    nombre: "",
    celular: "",
    cedula: "",
    cedula_lugar_expedicion: "",
    direccion: "",
    role: "inquilino" as Usuario["role"],
    activo: true,
    bloqueado: false,
  })
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then((res) => res.json())
      .then(setUsuarios)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (editingUser) {
      setEditForm({
        nombre: editingUser.nombre ?? "",
        celular: editingUser.celular ?? "",
        cedula: editingUser.cedula ?? "",
        cedula_lugar_expedicion: editingUser.cedula_lugar_expedicion ?? "",
        direccion: editingUser.direccion ?? "",
        role: editingUser.role,
        activo: editingUser.activo,
        bloqueado: editingUser.bloqueado,
      })
      setEditError(null)
    }
  }, [editingUser])

  function toggleActivo(usuario: Usuario) {
    const accion = usuario.activo ? "desactivar" : "activar"

    fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error)
        } else {
          fetch("/api/admin/usuarios")
            .then((res) => res.json())
            .then(setUsuarios)
        }
      })
      .catch((err) => alert("Error: " + err.message))
  }

  function toggleBloqueo(usuario: Usuario) {
    const accion = usuario.bloqueado ? "desbloquear" : "bloquear"
    const confirmMsg = usuario.bloqueado
      ? `Desbloquear a ${usuario.email}?`
      : `Bloquear definitivamente a ${usuario.email}?`

    if (!confirm(confirmMsg)) return

    fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error)
        } else {
          alert(data.mensaje || "Accion completada")
          fetch("/api/admin/usuarios")
            .then((res) => res.json())
            .then(setUsuarios)
        }
      })
      .catch((err) => alert("Error: " + err.message))
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)
    setEditError(null)
    fetch(`/api/admin/usuarios/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: editForm.nombre.trim() || null,
        celular: editForm.celular.trim() || null,
        cedula: editForm.cedula.trim() || null,
        cedula_lugar_expedicion: editForm.cedula_lugar_expedicion.trim() || null,
        direccion: editForm.direccion.trim() || null,
        role: editForm.role,
        activo: editForm.activo,
        bloqueado: editForm.bloqueado,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setEditError(data.error)
        } else {
          setEditingUser(null)
          fetch("/api/admin/usuarios")
            .then((res) => res.json())
            .then(setUsuarios)
        }
      })
      .catch((err) => setEditError(err.message ?? "Error de conexión"))
      .finally(() => setSaving(false))
  }

  const roleClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-800"
      case "propietario": return "bg-blue-100 text-blue-800"
      case "inquilino": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return "🔴 Administrador"
      case "propietario": return "🏠 Propietario"
      case "inquilino": return "👤 Inquilino"
      default: return role
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mt-2 text-3xl font-bold">Usuarios del Sistema</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios, roles, permisos y estados de acceso
        </p>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-sm">✅ Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.filter(u => u.activo).length}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm">⏸ Inactivos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.filter(u => !u.activo && !u.bloqueado).length}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-sm">🚫 Bloqueados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.filter(u => u.bloqueado).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando usuarios...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Usuario</th>
                    <th className="p-3 text-left">Rol</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Activar/Inactivar</th>
                    <th className="p-3 text-center">Bloquear</th>
                    <th className="p-3 text-center">Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className={`border-b ${usuario.bloqueado ? "bg-red-50" : ""}`}>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{usuario.nombre || usuario.email}</p>
                          <p className="text-xs text-muted-foreground">{usuario.email}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${roleClass(usuario.role)}`}>
                          {roleLabel(usuario.role)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {usuario.bloqueado ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                            🚫 Bloqueado
                          </span>
                        ) : usuario.activo ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            ✅ Activo
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                            ⏸ Inactivo
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={usuario.activo && !usuario.bloqueado}
                            disabled={usuario.bloqueado}
                            onChange={() => toggleActivo(usuario)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-muted-foreground">
                            {usuario.activo ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant={usuario.bloqueado ? "outline" : "destructive"}
                          onClick={() => toggleBloqueo(usuario)}
                        >
                          {usuario.bloqueado ? "🔓 Desbloquear" : "🚫 Bloquear"}
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(usuario)}
                        >
                          Editar
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

      {/* Modal Editar usuario */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setEditingUser(null)}
        >
          <Card
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Editar usuario</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => setEditingUser(null)}
              >
                Cerrar
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nombre completo</label>
                  <Input
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Correo electrónico</label>
                  <Input value={editingUser.email} disabled className="bg-muted" />
                  <p className="mt-1 text-xs text-muted-foreground">No se puede cambiar el correo</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Celular</label>
                  <Input
                    value={editForm.celular}
                    onChange={(e) => setEditForm((f) => ({ ...f, celular: e.target.value }))}
                    placeholder="Ej: 3001234567"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Cédula de ciudadanía</label>
                  <Input
                    value={editForm.cedula}
                    onChange={(e) => setEditForm((f) => ({ ...f, cedula: e.target.value }))}
                    placeholder="Número de cédula"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Lugar de expedición de la cédula</label>
                  <Input
                    value={editForm.cedula_lugar_expedicion}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, cedula_lugar_expedicion: e.target.value }))
                    }
                    placeholder="Ej: Bogotá D.C."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Dirección de vivienda</label>
                  <Input
                    value={editForm.direccion}
                    onChange={(e) => setEditForm((f) => ({ ...f, direccion: e.target.value }))}
                    placeholder="Ej: Cra 15 #42-18"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Rol</label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, role: e.target.value as Usuario["role"] }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.activo}
                      onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Activo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.bloqueado}
                      onChange={(e) => setEditForm((f) => ({ ...f, bloqueado: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Bloqueado</span>
                  </label>
                </div>
                {editError && (
                  <p className="text-sm text-destructive">{editError}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setEditingUser(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leyenda */}
      <Card className="mt-4 bg-gray-50">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-2">Leyenda:</p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                ✅ Activo
              </span>
              <span className="text-muted-foreground">- Puede acceder a la plataforma</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                ⏸ Inactivo
              </span>
              <span className="text-muted-foreground">- No puede acceder temporalmente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                🚫 Bloqueado
              </span>
              <span className="text-muted-foreground">- Bloqueado definitivamente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800">
                🔴 Administrador
              </span>
              <span className="text-muted-foreground">- Acceso total al sistema</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
