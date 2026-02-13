"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  function toggleActivo(usuario: Usuario) {
    // Aquí iría la llamada a la API para activar/desactivar
    alert(`${usuario.activo ? "Desactivar" : "Activar"} usuario: ${usuario.email}`)
  }

  function toggleBloqueo(usuario: Usuario) {
    // Aquí iría la llamada a la API para bloquear/desbloquear
    if (confirm(`¿${usuario.bloqueado ? "Desbloquear" : "Bloquear"} definitivamente a ${usuario.email}?`)) {
      alert(`${usuario.bloqueado ? "Desbloquear" : "Bloquear"} usuario: ${usuario.email}`)
    }
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
        <Link href="/reportes/personas" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Personas
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Usuarios del Sistema</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios, roles y permisos de acceso
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
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className={`border-b ${usuario.bloqueado ? "bg-red-50" : ""}`}>
                      {/* Usuario */}
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{usuario.nombre || usuario.email}</p>
                          <p className="text-xs text-muted-foreground">{usuario.email}</p>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="p-3">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${roleClass(usuario.role)}`}>
                          {roleLabel(usuario.role)}
                        </span>
                      </td>

                      {/* Estado */}
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

                      {/* Activar/Inactivar */}
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

                      {/* Bloquear */}
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant={usuario.bloqueado ? "outline" : "destructive"}
                          onClick={() => toggleBloqueo(usuario)}
                        >
                          {usuario.bloqueado ? "🔓 Desbloquear" : "🚫 Bloquear"}
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
