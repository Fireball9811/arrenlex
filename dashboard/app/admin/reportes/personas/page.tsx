"use client"

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

export default function PersonasPage() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabValue>("propietarios")

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

  const tabs: { value: TabValue; label: string; count: number }[] = [
    { value: "inquilinos-activos", label: "Inquilinos Activos", count: counts?.inquilinosActivos || 0 },
    { value: "propietarios", label: "Propietarios", count: counts?.propietarios || 0 },
    { value: "usuarios-sistema", label: "Usuarios Sistema", count: counts?.usuariosSistema || 0 },
    { value: "historial-inquilinos", label: "Inquilinos Inactivos", count: counts?.historialInquilinos || 0 },
    { value: "roles-permisos", label: "Roles", count: counts?.roles || 0 },
    { value: "contactos", label: "Contactos", count: counts?.contactos || 0 },
  ]

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
              <p className="text-2xl font-bold">{formatCount(tab.count)}</p>
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
