"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ReportesPage() {
  const reportes = [
    {
      title: "Financiero",
      description: "Reportes de ingresos, pagos y consignaciones",
      href: "/reportes/financiero",
      icon: "💰",
      color: "bg-green-50 border-green-200 hover:bg-green-100",
    },
    {
      title: "Personas",
      description: "Reportes de inquilinos, propietarios y usuarios",
      href: "/reportes/personas",
      icon: "👥",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    },
    {
      title: "Propiedades",
      description: "Estado y ocupación de propiedades",
      href: "/reportes/propiedades",
      icon: "🏠",
      color: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    },
    {
      title: "Generales",
      description: "Resumen general del sistema",
      href: "/reportes/generales",
      icon: "📊",
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    },
    {
      title: "Documentos",
      description: "Gestión de documentos y contratos",
      href: "/reportes/documentos",
      icon: "📄",
      color: "bg-slate-50 border-slate-200 hover:bg-slate-100",
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Selecciona una categoría para ver los reportes disponibles
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
