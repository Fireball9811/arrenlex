"use client"

// Forzar renderizado dinámico para evitar errores de hidratación
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { InquilinosActivosTab } from "./components/InquilinosActivosTab"
import { PropietariosTab } from "./components/PropietariosTab"
import { MisDatosPersonalesTab } from "./components/MisDatosPersonalesTab"
import { UsuariosSistemaTab } from "./components/UsuariosSistemaTab"
import { HistorialInquilinosTab } from "./components/HistorialInquilinosTab"
import { RolesPermisosTab } from "./components/RolesPermisosTab"
import { ContactosTab } from "./components/ContactosTab"
import { useLang } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"

type Counts = {
  inquilinosActivos: number
  propietarios: number
  usuariosSistema: number
  historialInquilinos: number
  roles: number
  contactos: number
}

type TabValue = "inquilinos-activos" | "propietarios" | "usuarios-sistema" | "historial-inquilinos" | "roles-permisos" | "contactos"

const TABS_PROPIETARIO = [
  { value: "inquilinos-activos" as const, label: "", count: 0 },
  { value: "propietarios" as const, label: "", count: 0 },
  { value: "historial-inquilinos" as const, label: "", count: 0 },
]

const TABS_ADMIN = [
  { value: "inquilinos-activos" as const, label: "", count: 0 },
  { value: "propietarios" as const, label: "", count: 0 },
  { value: "usuarios-sistema" as const, label: "", count: 0 },
  { value: "historial-inquilinos" as const, label: "", count: 0 },
  { value: "roles-permisos" as const, label: "", count: 0 },
  { value: "contactos" as const, label: "", count: 0 },
]

export default function PersonasPage() {
  const { t } = useLang()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>("inquilinos-activos")

  useEffect(() => {
    // Obtener rol del usuario
    const loadUserRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("role")
          .eq("id", user.id)
          .single()
        setUserRole(perfil?.role || null)
      }
    }
    loadUserRole()
  }, [])

  useEffect(() => {
    fetch("/api/reportes/personas/counts")
      .then((r) => r.json())
      .then((data) => setCounts(data))
      .catch(() => {})
  }, [])

  // Determinar tabs según el rol del usuario
  let tabs: typeof TABS_ADMIN
  if (userRole === "propietario") {
    tabs = TABS_PROPIETARIO.map((tab) => ({
      ...tab,
      label: tab.value === "inquilinos-activos" ? t.reportes.tabs.inquilinosActivos :
             tab.value === "propietarios" ? "Mis Datos" :
             tab.value === "historial-inquilinos" ? t.reportes.tabs.historial :
             "",
      count: counts?.[tab.value === "inquilinos-activos" ? "inquilinosActivos" :
                      tab.value === "historial-inquilinos" ? "historialInquilinos" :
                      "propietarios"] || 0
    }))
  } else {
    tabs = TABS_ADMIN.map((tab) => ({
      ...tab,
      label: tab.value === "inquilinos-activos" ? t.reportes.tabs.inquilinosActivos :
             tab.value === "propietarios" ? t.reportes.tabs.propietarios :
             tab.value === "usuarios-sistema" ? t.reportes.tabs.usuariosSistema :
             tab.value === "historial-inquilinos" ? t.reportes.tabs.historial :
             tab.value === "roles-permisos" ? t.reportes.tabs.roles :
             t.reportes.tabs.contactos,
      count: counts?.[tab.value === "inquilinos-activos" ? "inquilinosActivos" :
                      tab.value === "historial-inquilinos" ? "historialInquilinos" :
                      tab.value === "usuarios-sistema" ? "usuariosSistema" :
                      tab.value === "roles-permisos" ? "roles" :
                      tab.value] || 0
    }))
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
        {activeTab === "inquilinos-activos" && <InquilinosActivosTab isAdmin={userRole === "admin"} />}
        {activeTab === "propietarios" && (
          userRole === "propietario" ? <MisDatosPersonalesTab /> : <PropietariosTab />
        )}
        {activeTab === "usuarios-sistema" && <UsuariosSistemaTab />}
        {activeTab === "historial-inquilinos" && <HistorialInquilinosTab />}
        {activeTab === "roles-permisos" && <RolesPermisosTab />}
        {activeTab === "contactos" && <ContactosTab />}
      </div>
    </div>
  )
}
