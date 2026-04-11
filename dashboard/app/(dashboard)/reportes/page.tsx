"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLang } from "@/lib/i18n/context"

interface ReporteCard {
  title: string
  description: string
  href: string
  icon: string
  color: string
}

export default function ReportesPage() {
  const { t } = useLang()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: string } | null) => {
        setRole(data?.role ?? "unknown")
      })
      .catch(() => setRole("unknown"))
  }, [])

  const reportesPropietario: ReporteCard[] = [
    {
      title: "Gestión de Pagos",
      description: "Pagos recibidos en los últimos 12 meses",
      href: "/propietario/reportes/gestion-pagos",
      icon: "💳",
      color: "bg-green-50 border-green-200 hover:bg-green-100",
    },
    {
      title: "Historial de Pagos",
      description: "Recibos emitidos agrupados por arrendatario",
      href: "/propietario/reportes/historial",
      icon: "📋",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    },
    {
      title: "Pendientes por pagar",
      description: "Propiedades sin recibo registrado este mes",
      href: "/propietario/reportes/pendientes",
      icon: "⏳",
      color: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    },
    {
      title: t.reportes.propiedadesCard,
      description: t.reportes.descPropiedades,
      href: "/reportes/propiedades",
      icon: "🏠",
      color: "bg-slate-50 border-slate-200 hover:bg-slate-100",
    },
  ]

  const reportesGeneral: ReporteCard[] = [
    {
      title: t.reportes.financiero,
      description: t.reportes.descFinanciero,
      href: "/reportes/financiero",
      icon: "💰",
      color: "bg-green-50 border-green-200 hover:bg-green-100",
    },
    {
      title: t.reportes.personas,
      description: t.reportes.descPersonas,
      href: "/reportes/personas",
      icon: "👥",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    },
    {
      title: t.reportes.propiedadesCard,
      description: t.reportes.descPropiedades,
      href: "/reportes/propiedades",
      icon: "🏠",
      color: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    },
    {
      title: t.reportes.generales,
      description: t.reportes.descGenerales,
      href: "/reportes/generales",
      icon: "📊",
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    },
    {
      title: t.reportes.documentos,
      description: t.reportes.descDocumentos,
      href: "/reportes/documentos",
      icon: "📄",
      color: "bg-slate-50 border-slate-200 hover:bg-slate-100",
    },
  ]

  const reportes = role === "propietario" ? reportesPropietario : reportesGeneral

  if (role === null) {
    return <p className="text-muted-foreground">Cargando...</p>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.reportes.titulo}</h1>
        <p className="text-muted-foreground">
          {t.reportes.descripcion}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportes.map((reporte) => (
          <Link key={reporte.href} href={reporte.href}>
            <Card className={`h-full transition ${reporte.color}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{reporte.icon}</span>
                  <div>
                    <CardTitle className="text-xl">{reporte.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {reporte.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
