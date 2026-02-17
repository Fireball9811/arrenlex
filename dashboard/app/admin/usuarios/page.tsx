"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"

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

function UsuariosContent() {
  const searchParams = useSearchParams()
  const createParam = searchParams.get("create")

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  // Formulario de creación - se abre si viene del dashboard con ?create=true
  const [showForm, setShowForm] = useState(createParam === "true")
  const [formData, setFormData] = useState({
    email: "",
    nombre: "",
    role: "inquilino",
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchUsuarios()
  }, [])

  async function fetchUsuarios() {
    setLoading(true)
    fetch("/api/admin/usuarios")
      .then((res) => res.json())
      .then(setUsuarios)
      .finally(() => setLoading(false))
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: "success", text: `Usuario creado exitosamente. Invitación enviada a ${formData.email}` })
        setFormData({ email: "", nombre: "", role: "inquilino" })
        setShowForm(false)
        fetchUsuarios()
      } else {
        setMessage({ type: "error", text: data.error || "Error al crear usuario" })
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setSubmitting(false)
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
      .catch((err) => alert("Error: " + err.message))
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
      .catch((err) => alert("Error: " + err.message))
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuarios del Sistema</h1>
          <p className="text-muted-foreground">Gestiona usuarios, roles y estados</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {showForm ? "Cancelar" : "Nuevo Usuario"}
        </Button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Crear Nuevo Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={crearUsuario} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    placeholder="Juan Pérez García"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Rol *
                  </label>
                  <select
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.role.includes("_special")
                      ? "⚠️ Roles especiales: acceso limitado a dashboards específicos"
                      : "Roles estándar del sistema"}
                  </p>
                </div>
              </div>

              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <span className="text-sm">{message.text}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !formData.email}>
                  {submitting ? "Creando..." : "Crear Usuario"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de resumen */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{usuarios.length}</p></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardHeader><CardTitle className="text-sm">Activos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{usuarios.filter(u => u.activo).length}</p></CardContent></Card>
        <Card className="bg-amber-50 border-amber-200"><CardHeader><CardTitle className="text-sm">Inactivos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{usuarios.filter(u => !u.activo && !u.bloqueado).length}</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardHeader><CardTitle className="text-sm">Bloqueados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{usuarios.filter(u => u.bloqueado).length}</p></CardContent></Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader><CardTitle>Lista</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Cargando...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Usuario</th>
                    <th className="p-3 text-left">Rol</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Activar/Inactivar</th>
                    <th className="p-3 text-center">Bloquear</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className={`border-b ${u.bloqueado ? "bg-red-50" : ""}`}>
                      <td className="p-3"><p className="font-medium">{u.nombre || u.email}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
                      <td className="p-3"><span className={`rounded px-2 py-1 text-xs font-medium ${roleClass(u.role)}`}>{roleLabel(u.role)}</span></td>
                      <td className="p-3 text-center">
                        {u.bloqueado ? <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Bloqueado</span> : u.activo ? <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Activo</span> : <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Inactivo</span>}
                      </td>
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={u.activo && !u.bloqueado} disabled={u.bloqueado} onChange={() => toggleActivo(u)} className="h-4 w-4 rounded border-gray-300" />
                      </td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant={u.bloqueado ? "outline" : "destructive"} onClick={() => toggleBloqueo(u)}>{u.bloqueado ? "Desbloquear" : "Bloquear"}</Button>
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

export default function UsuariosSistemaPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando...</p>}>
      <UsuariosContent />
    </Suspense>
  )
}
