"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Key } from "lucide-react"
import type { Perfil } from "@/lib/types/database"

const ROLES_INFO = [
  {
    role: "admin",
    nombre: "Administrador",
    descripcion: "Acceso completo al sistema",
    color: "bg-purple-100 text-purple-800",
    permisos: ["Gestión de usuarios", "Gestión de propiedades", "Gestión de contratos", "Reportes completos", "Configuración del sistema"]
  },
  {
    role: "propietario",
    nombre: "Propietario",
    descripcion: "Dueño de inmuebles",
    color: "bg-blue-100 text-blue-800",
    permisos: ["Ver sus propiedades", "Ver contratos de sus propiedades", "Ver pagos recibidos", "Reportes de sus propiedades"]
  },
  {
    role: "inquilino",
    nombre: "Inquilino",
    descripcion: "Arrendatario de inmuebles",
    color: "bg-green-100 text-green-800",
    permisos: ["Ver sus contratos", "Ver sus pagos", "Solicitar mantenimiento", "Ver su historial"]
  },
  {
    role: "maintenance_special",
    nombre: "Mantenimiento (Especial)",
    descripcion: "Encargado de mantenimiento",
    color: "bg-orange-100 text-orange-800",
    permisos: ["Ver solicitudes de mantenimiento asignadas", "Actualizar estado de solicitudes", "Ver historial de mantenimientos"]
  },
  {
    role: "insurance_special",
    nombre: "Seguros (Especial)",
    descripcion: "Gestor de seguros",
    color: "bg-cyan-100 text-cyan-800",
    permisos: ["Ver casos de seguros asignados", "Gestionar solicitudes de seguros", "Ver pólizas"]
  },
  {
    role: "lawyer_special",
    nombre: "Legal (Especial)",
    descripcion: "Gestor legal",
    color: "bg-indigo-100 text-indigo-800",
    permisos: ["Ver casos legales asignados", "Gestionar documentos legales", "Ver contratos legales"]
  },
]

export function RolesPermisosTab() {
  const [usuariosPorRol, setUsuariosPorRol] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsuariosPorRol()
  }, [])

  async function fetchUsuariosPorRol() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/usuarios")
      const data: Perfil[] = await res.json()

      const conteos: Record<string, number> = {}
      ROLES_INFO.forEach(r => {
        conteos[r.role] = data.filter(u => u.role === r.role && u.activo && !u.bloqueado).length
      })

      setUsuariosPorRol(conteos)
    } catch (error) {
      console.error("Error fetching usuarios por rol:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Roles y Permisos</h2>
        <p className="text-muted-foreground">Configuración de roles y permisos del sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ROLES_INFO.map((rol) => (
          <Card key={rol.role}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle className="text-lg">{rol.nombre}</CardTitle>
                </div>
                <span className={`rounded px-2 py-1 text-xs font-medium ${rol.color}`}>
                  {rol.role}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{rol.descripcion}</p>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Usuarios activos:</p>
                <p className="text-2xl font-bold">{loading ? "..." : usuariosPorRol[rol.role] || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Key className="h-4 w-4" /> Permisos:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {rol.permisos.map((permiso, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {permiso}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
