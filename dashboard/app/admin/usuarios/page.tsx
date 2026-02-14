"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Usuario {
  id: string
  email: string
  role: "admin" | "propietario" | "inquilino"
  nombre?: string
  activo: boolean
  bloqueado: boolean
  creado_en: string
}

export default function UsuariosSistemaPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then((res) => res.json())
      .then(setUsuarios)
      .finally(() => setLoading(false))
  }, [])

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
        else fetch("/api/admin/usuarios").then((res) => res.json()).then(setUsuarios)
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
          fetch("/api/admin/usuarios").then((res) => res.json()).then(setUsuarios)
        }
      })
      .catch((err) => alert("Error: " + err.message))
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
      case "admin": return "Administrador"
      case "propietario": return "Propietario"
      case "inquilino": return "Inquilino"
      default: return role
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Usuarios del Sistema</h1>
        <p className="text-muted-foreground">Gestiona usuarios, roles y estados</p>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{usuarios.length}</p></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardHeader><CardTitle className="text-sm">Activos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{usuarios.filter(u => u.activo).length}</p></CardContent></Card>
        <Card className="bg-amber-50 border-amber-200"><CardHeader><CardTitle className="text-sm">Inactivos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{usuarios.filter(u => !u.activo && !u.bloqueado).length}</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardHeader><CardTitle className="text-sm">Bloqueados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{usuarios.filter(u => u.bloqueado).length}</p></CardContent></Card>
      </div>
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
