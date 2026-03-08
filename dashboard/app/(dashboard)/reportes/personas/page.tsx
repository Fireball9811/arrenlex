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
import { useLang } from "@/lib/i18n/context"

type Counts = {
  inquilinosActivos: number
  propietarios: number
  usuariosSistema: number
  historialInquilinos: number
  roles: number
  contactos: number
}

export default function PersonasPage() {
  const { t } = useLang()
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
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          {t.reportes.volverReportes}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{t.reportes.personasTitulo}</h1>
        <p className="text-muted-foreground">
          {t.reportes.personasDesc}
        </p>
      </div>

      {/* Resumen de contadores */}
      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.reportes.tabs.inquilinosActivos}</p>
            <p className="text-2xl font-bold">{formatCount(counts?.inquilinosActivos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.reportes.tabs.propietarios}</p>
            <p className="text-2xl font-bold">{formatCount(counts?.propietarios)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.reportes.tabs.usuariosSistema}</p>
            <p className="text-2xl font-bold">{formatCount(counts?.usuariosSistema)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.reportes.tabs.historial}</p>
            <p className="text-2xl font-bold">{formatCount(counts?.historialInquilinos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.reportes.tabs.roles}</p>
            <p className="text-2xl font-bold">{formatCount(counts?.roles)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.reportes.tabs.contactos}</p>
            <p className="text-2xl font-bold">{formatCount(counts?.contactos)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas de gestión */}
      <Tabs defaultValue="inquilinos-activos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="inquilinos-activos" className="text-sm">
            {t.reportes.tabs.inquilinosActivos}
          </TabsTrigger>
          <TabsTrigger value="propietarios" className="text-sm">
            {t.reportes.tabs.propietarios}
          </TabsTrigger>
          <TabsTrigger value="usuarios-sistema" className="text-sm">
            {t.reportes.tabs.usuariosSistema}
          </TabsTrigger>
          <TabsTrigger value="historial-inquilinos" className="text-sm">
            {t.reportes.tabs.historial}
          </TabsTrigger>
          <TabsTrigger value="roles-permisos" className="text-sm">
            {t.reportes.tabs.roles}
          </TabsTrigger>
          <TabsTrigger value="contactos" className="text-sm">
            {t.reportes.tabs.contactos}
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
