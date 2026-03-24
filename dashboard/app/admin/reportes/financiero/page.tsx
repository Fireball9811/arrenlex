"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AdminReportesFinancieroPage() {
  const reportes = [
    {
      title: "Historial de Pagos",
      description: "Ver todos los recibos emitidos, agrupados por arrendatario con sumatorias. Filtra por propietario y rango de fechas.",
      href: "/admin/reportes/financiero/historial",
      icon: "📋",
      color: "bg-blue-50 border-blue-200",
    },
    {
      title: "Pendientes por Pagar",
      description: "Propiedades con contratos activos que no tienen recibo registrado en el mes actual. Filtra por propietario.",
      href: "/admin/reportes/financiero/pendientes",
      icon: "⏳",
      color: "bg-amber-50 border-amber-200",
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Reportes Financieros</h1>
        <p className="text-muted-foreground">
          Gestión de pagos, consignaciones e ingresos — todos los propietarios
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reportes.map((reporte) => (
          <Card key={reporte.href} className={"transition " + reporte.color}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-2xl">{reporte.icon}</span>
                {reporte.title}
              </CardTitle>
              <CardDescription className="mt-2">{reporte.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href={reporte.href}>Abrir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
