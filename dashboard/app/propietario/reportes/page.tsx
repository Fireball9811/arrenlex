"use client"

import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ReporteCard {
  title: string
  description: string
  href: string
  icon: string
  color: string
}

const reportes: ReporteCard[] = [
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
    title: "Propiedades",
    description: "Estado y estadísticas de tus propiedades",
    href: "/reportes/propiedades",
    icon: "🏠",
    color: "bg-slate-50 border-slate-200 hover:bg-slate-100",
  },
  {
    title: "Arrendatarios",
    description: "Gestiona, edita y consulta tus arrendatarios activos e inactivos",
    href: "/propietario/reportes/arrendatarios",
    icon: "👥",
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
  },
]

export default function PropietarioReportesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Consulta el estado de tus propiedades, pagos y arrendatarios
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
