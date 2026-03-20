"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Pencil, Power, Trash2, CheckCircle, XCircle, RefreshCw } from "lucide-react"

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
  const [userProperties, setUserProperties] = useState<{ [key: string]: number }>({})

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
        else fetchUsuarios()
      })
      .catch((err) => alert("Error: " + err))
  }

  async function restablecerContrasena(usuario: Usuario) {
    if (!confirm(`¿Enviar contraseña temporal a ${usuario.email}?`)) return

    try {
      const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "resetear_contrasena" }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message || `Contraseña temporal enviada a ${usuario.email}`)
      } else {
        alert(data.error || "Error al enviar contraseña temporal")
      }
    } catch (err) {
      alert("Error: " + err)
    }
  }

  function eliminarUsuario(usuario: Usuario) {
    if (!confirm(`¿Eliminar a ${usuario.email}? Esta acción no se puede deshacer.`)) return

    fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else {
          alert("Usuario eliminado exitosamente")
          fetchUsuarios()
        }
      })
      .catch((err) => alert("Error: " + err))
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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

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
                    <th className="p-3 text-center">Acciones</th>
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
                        <div className="flex items-center justify-center gap-1">
                          {/* Editar */}
                          <Link href={`/reportes/personas/usuarios/${u.id}`}>
                            <Button size="sm" variant="outline" title="Editar">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </Link>
                          {/* Activo/Inactivar */}
                          <Button
                            size="sm"
                            variant={u.activo ? "outline" : "default"}
                            onClick={() => toggleActivo(u)}
                            title={u.activo ? "Desactivar" : "Activar"}
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                          {/* Bloquear/Desbloquear */}
                          <Button
                            size="sm"
                            variant={u.bloqueado ? "outline" : "destructive"}
                            onClick={() => toggleBloqueo(u)}
                            title={u.bloqueado ? "Desbloquear" : "Bloquear"}
                          >
                            {u.bloqueado ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          </Button>
                          {/* Restablecer contraseña */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => restablecerContrasena(u)}
                            title="Restablecer contraseña"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          {/* Eliminar */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => eliminarUsuario(u)}
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
    </div>
  )
}
