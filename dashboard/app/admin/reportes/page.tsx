"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminReportesPage() {
  const reportes = [
    { title: "Financiero", description: "Ingresos, pagos y consignaciones", href: "/admin/reportes/financiero", icon: "💰" },
    { title: "Gestión de Pagos", description: "Todos los pagos del sistema", href: "/admin/reportes/gestion-pagos", icon: "💳" },
    { title: "Personas", description: "Inquilinos y usuarios", href: "/admin/reportes/personas", icon: "👥" },
    { title: "Propiedades", description: "Estado de propiedades", href: "/admin/reportes/propiedades", icon: "🏠" },
  ]
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Reportes</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {reportes.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full transition hover:shadow-md">
              <CardHeader>
                <span className="text-3xl">{r.icon}</span>
                <CardTitle>{r.title}</CardTitle>
                <CardDescription>{r.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
