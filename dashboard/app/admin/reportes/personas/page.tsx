"use client"

// Forzar renderizado dinámico para evitar errores de hidratación
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import Link from "next/link"
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

type TabValue = "inquilinos-activos" | "propietarios" | "usuarios-sistema" | "historial-inquilinos" | "roles-permisos" | "contactos"

const INITIAL_TABS = [
  { value: "inquilinos-activos" as const, label: "Inquilinos Activos", count: 0 },
  { value: "propietarios" as const, label: "Propietarios", count: 0 },
  { value: "usuarios-sistema" as const, label: "Usuarios Sistema", count: 0 },
  { value: "historial-inquilinos" as const, label: "Inquilinos Inactivos", count: 0 },
  { value: "roles-permisos" as const, label: "Roles", count: 0 },
  { value: "contactos" as const, label: "Contactos", count: 0 },
]

export default function PersonasPage() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>("propietarios")

  useEffect(() => {
    fetch("/api/reportes/personas/counts")
      .then((r) => r.json())
      .then((data) => setCounts(data))
      .catch(() => {})
  }, [])

  const tabs = INITIAL_TABS.map((tab) => ({
    ...tab,
    count: counts?.[tab.value === "inquilinos-activos" ? "inquilinosActivos" :
                    tab.value === "historial-inquilinos" ? "historialInquilinos" :
                    tab.value === "usuarios-sistema" ? "usuariosSistema" :
                    tab.value === "roles-permisos" ? "roles" :
                    tab.value] || 0
  }))

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

      {/* Resumen de contadores clickeables */}
      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {tabs.map((tab) => (
          <Card
            key={tab.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeTab === tab.value ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setActiveTab(tab.value)}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{tab.label}</p>
              <p className="text-2xl font-bold">{counts ? tab.count : 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contenido según la tab activa */}
      <div className="space-y-4">
        {activeTab === "inquilinos-activos" && <InquilinosActivosTab />}
        {activeTab === "propietarios" && <PropietariosTab />}
        {activeTab === "usuarios-sistema" && <UsuariosSistemaTab />}
        {activeTab === "historial-inquilinos" && <HistorialInquilinosTab />}
        {activeTab === "roles-permisos" && <RolesPermisosTab />}
        {activeTab === "contactos" && <ContactosTab />}
      </div>
    </div>
  )
}
