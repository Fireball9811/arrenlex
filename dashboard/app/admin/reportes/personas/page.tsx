"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { InquilinosActivosTab } from "./components/InquilinosActivosTab"
import { PropietariosTab } from "./components/PropietariosTab"
import { UsuariosSistemaTab } from "./components/UsuariosSistemaTab"
import { HistorialInquilinosTab } from "./components/HistorialInquilinosTab"
import { RolesPermisosTab } from "./components/RolesPermisosTab"
import { ContactosTab } from "./components/ContactosTab"

type Counts = {
  inquilinosActivos: number
  propietarios: number
  usuariosSistema: number
  historialInquilinos: number
  roles: number
  contactos: number
}

export default function PersonasPage() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/reportes/personas/counts")
      .then((r) => r.json())
      .then((data) => {
        setCounts(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const formatCount = (count: number | undefined) => {
    if (loading) return "..."
    return count ?? 0
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Gestión de Personas</h1>
        <p className="text-muted-foreground">
          Administra inquilinos, propietarios, usuarios y roles del sistema
        </p>
      </div>

      {/* Resumen de contadores */}
      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Inquilinos Activos</p>
            <p className="text-2xl font-bold">{formatCount(counts?.inquilinosActivos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Propietarios</p>
            <p className="text-2xl font-bold">{formatCount(counts?.propietarios)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Usuarios Sistema</p>
            <p className="text-2xl font-bold">{formatCount(counts?.usuariosSistema)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Historial</p>
            <p className="text-2xl font-bold">{formatCount(counts?.historialInquilinos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Roles</p>
            <p className="text-2xl font-bold">{formatCount(counts?.roles)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Contactos</p>
            <p className="text-2xl font-bold">{formatCount(counts?.contactos)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas de gestión */}
      <Tabs defaultValue="propietarios" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="inquilinos-activos" className="text-sm">
            Inquilinos Activos
          </TabsTrigger>
          <TabsTrigger value="propietarios" className="text-sm">
            Propietarios
          </TabsTrigger>
          <TabsTrigger value="usuarios-sistema" className="text-sm">
            Usuarios Sistema
          </TabsTrigger>
          <TabsTrigger value="historial-inquilinos" className="text-sm">
            Historial
          </TabsTrigger>
          <TabsTrigger value="roles-permisos" className="text-sm">
            Roles
          </TabsTrigger>
          <TabsTrigger value="contactos" className="text-sm">
            Contactos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inquilinos-activos" className="space-y-4">
          <InquilinosActivosTab />
        </TabsContent>

        <TabsContent value="propietarios" className="space-y-4">
          <PropietariosTab />
        </TabsContent>

        <TabsContent value="usuarios-sistema" className="space-y-4">
          <UsuariosSistemaTab />
        </TabsContent>

        <TabsContent value="historial-inquilinos" className="space-y-4">
          <HistorialInquilinosTab />
        </TabsContent>

        <TabsContent value="roles-permisos" className="space-y-4">
          <RolesPermisosTab />
        </TabsContent>

        <TabsContent value="contactos" className="space-y-4">
          <ContactosTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
