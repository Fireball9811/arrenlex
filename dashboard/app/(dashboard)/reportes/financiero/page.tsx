"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function FinancieroPage() {
  const reportes = [
    {
      title: "Historial de Pagos",
      description: "Ver todos los pagos recibidos con detalles de inquilinos",
      href: "/reportes/financiero/historial",
      icon: "📋",
      color: "bg-blue-50 border-blue-200",
    },
    {
      title: "Reporte por Concepto",
      description: "Resumen de ingresos agrupados por concepto",
      href: "/reportes/financiero/concepto",
      icon: "📑",
      color: "bg-purple-50 border-purple-200",
    },
    {
      title: "Consignar Pago",
      description: "Formulario PSE para que los inquilinos realicen consignaciones",
      href: "/reportes/financiero/consignar",
      icon: "💳",
      color: "bg-green-50 border-green-200",
    },
    {
      title: "Pendientes por Pagar",
      description: "Ver pagos pendientes y vencidos",
      href: "/reportes/financiero/pendientes",
      icon: "⏳",
      color: "bg-amber-50 border-amber-200",
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Reportes Financieros</h1>
        <p className="text-muted-foreground">
          Gestion de pagos, consignaciones e ingresos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reportes.map((reporte) => (
          <Card key={reporte.href} className={"transition " + reporte.color}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <span className="text-2xl">{reporte.icon}</span>
                    {reporte.title}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {reporte.description}
                  </CardDescription>
                </div>
              </div>
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
