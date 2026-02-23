"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Phone, Mail, MapPin, Building2 } from "lucide-react"
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

      {/* Grid de contactos */}
      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : filteredContactos.length === 0 ? (
        <p className="text-muted-foreground">No se encontraron contactos</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContactos.map((contacto) => (
            <Card key={contacto.id} className="hover:shadow-md transition">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {contacto.nombre || "Sin nombre"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{contacto.email}</p>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${getRolColor(contacto.role)}`}>
                    {getRolLabel(contacto.role)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {contacto.celular && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${contacto.celular}`}
                      className="hover:underline text-blue-600"
                    >
                      {contacto.celular}
                    </a>
                  </div>
                )}
                {contacto.cedula && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">C.C.:</span> {contacto.cedula}
                  </div>
                )}
                {contacto.direccion && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span className="line-clamp-2">{contacto.direccion}</span>
                  </div>
                )}
                {contacto.role === "propietario" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Building2 className="h-4 w-4" />
                    <span>Propietario</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resumen */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">
          Total de contactos: <span className="font-bold">{filteredContactos.length}</span>
        </p>
      </div>
    </div>
  )
}
