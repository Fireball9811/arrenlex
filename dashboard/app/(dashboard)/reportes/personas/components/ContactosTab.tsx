"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, Building2, Pencil, Power, XCircle, CheckCircle, Trash2 } from "lucide-react"
import type { Perfil } from "@/lib/types/database"

interface Contacto extends Perfil {
  propiedades_count?: number
}

export function ContactosTab() {
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroRol, setFiltroRol] = useState<string>("todos")

  useEffect(() => {
    fetchContactos()
  }, [])

  async function fetchContactos() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/usuarios")
      const data: Perfil[] = await res.json()
      // Solo usuarios activos y no bloqueados
      const activos = data.filter(u => u.activo && !u.bloqueado)
      setContactos(activos)
    } catch (error) {
      console.error("Error fetching contactos:", error)
    } finally {
      setLoading(false)
    }
  }

  function toggleActivo(contacto: Contacto) {
    const accion = contacto.activo ? "desactivar" : "activar"
    if (!confirm(contacto.activo
      ? `¿Desactivar a ${contacto.nombre || contacto.email}?`
      : `¿Activar a ${contacto.nombre || contacto.email}?`)) return

    fetch(`/api/admin/usuarios/${contacto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else fetchContactos()
      })
      .catch((err) => alert("Error: " + err))
  }

  function toggleBloqueo(contacto: Contacto) {
    const accion = contacto.bloqueado ? "desbloquear" : "bloquear"
    if (!confirm(contacto.bloqueado
      ? `¿Desbloquear a ${contacto.nombre || contacto.email}?`
      : `¿Bloquear a ${contacto.nombre || contacto.email}?`)) return

    fetch(`/api/admin/usuarios/${contacto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else fetchContactos()
      })
      .catch((err) => alert("Error: " + err))
  }

  function eliminarUsuario(contacto: Contacto) {
    if (!confirm(`¿Eliminar a ${contacto.nombre || contacto.email}? Esta acción no se puede deshacer.`)) return

    fetch(`/api/admin/usuarios/${contacto.id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else {
          alert("Usuario eliminado exitosamente")
          fetchContactos()
        }
      })
      .catch((err) => alert("Error: " + err))
  }

  const filteredContactos = contactos.filter((c) => {
    const matchSearch =
      c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.celular?.includes(searchTerm)

    const matchRol = filtroRol === "todos" || c.role === filtroRol

    return matchSearch && matchRol
  })

  const getRolLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      propietario: "Propietario",
      inquilino: "Inquilino",
      maintenance_special: "Mantenimiento",
      insurance_special: "Seguros",
      lawyer_special: "Legal",
    }
    return labels[role] || role
  }

  const getRolColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-purple-100 text-purple-800",
      propietario: "bg-blue-100 text-blue-800",
      inquilino: "bg-green-100 text-green-800",
      maintenance_special: "bg-orange-100 text-orange-800",
      insurance_special: "bg-cyan-100 text-cyan-800",
      lawyer_special: "bg-indigo-100 text-indigo-800",
    }
    return colors[role] || "bg-gray-100 text-gray-800"
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Directorio de Contactos</h2>
        <p className="text-muted-foreground">Información de contacto de todos los usuarios activos</p>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por nombre, email o celular..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
        >
          <option value="todos">Todos los roles</option>
          <option value="admin">Administradores</option>
          <option value="propietario">Propietarios</option>
          <option value="inquilino">Inquilinos</option>
          <option value="maintenance_special">Mantenimiento</option>
          <option value="insurance_special">Seguros</option>
          <option value="lawyer_special">Legal</option>
        </select>
      </div>

      {/* Tabla de contactos */}
      <Card>
        <CardHeader>
          <CardTitle>Contactos ({filteredContactos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredContactos.length === 0 ? (
            <p className="text-muted-foreground">No se encontraron contactos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Nombre</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Celular</th>
                    <th className="p-3 text-left">Cédula</th>
                    <th className="p-3 text-left">Dirección</th>
                    <th className="p-3 text-center">Rol</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContactos.map((contacto) => (
                    <tr key={contacto.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium">{contacto.nombre || "Sin nombre"}</p>
                        {contacto.role === "propietario" && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3" />
                            <span>Propietario</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {contacto.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <a href={`mailto:${contacto.email}`} className="hover:underline text-blue-600">
                              {contacto.email}
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {contacto.celular ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <a href={`tel:${contacto.celular}`} className="hover:underline text-blue-600">
                              {contacto.celular}
                            </a>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="p-3">{contacto.cedula || "—"}</td>
                      <td className="p-3">
                        {contacto.direccion ? (
                          <div className="flex items-start gap-1 max-w-xs">
                            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{contacto.direccion}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${getRolColor(contacto.role)}`}>
                          {getRolLabel(contacto.role)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {contacto.bloqueado ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Bloqueado</span>
                        ) : contacto.activo ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Activo</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Inactivo</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Editar */}
                          <Link href={`/reportes/personas/usuarios/${contacto.id}`}>
                            <Button size="sm" variant="outline" title="Editar">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </Link>
                          {/* Activo/Inactivar */}
                          <Button
                            size="sm"
                            variant={contacto.activo ? "outline" : "default"}
                            onClick={() => toggleActivo(contacto)}
                            title={contacto.activo ? "Desactivar" : "Activar"}
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                          {/* Bloquear/Desbloquear */}
                          <Button
                            size="sm"
                            variant={contacto.bloqueado ? "outline" : "destructive"}
                            onClick={() => toggleBloqueo(contacto)}
                            title={contacto.bloqueado ? "Desbloquear" : "Bloquear"}
                          >
                            {contacto.bloqueado ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          </Button>
                          {/* Eliminar */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => eliminarUsuario(contacto)}
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

      {/* Resumen */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">
          Total de contactos: <span className="font-bold">{filteredContactos.length}</span>
        </p>
      </div>
    </div>
  )
}
