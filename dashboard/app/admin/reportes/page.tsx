"use client"

import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLang } from "@/lib/i18n/context"

export default function AdminReportesPage() {
  const { t } = useLang()

  const reportes = [
    { title: t.reportes.financiero, description: t.reportes.descFinanciero, href: "/admin/reportes/financiero", icon: "💰" },
    { title: t.reportes.gestionPagos.titulo, description: t.reportes.descFinanciero, href: "/admin/reportes/gestion-pagos", icon: "💳" },
    { title: t.reportes.personas, description: t.reportes.descPersonas, href: "/admin/reportes/personas", icon: "👥" },
    { title: t.reportes.propiedadesCard, description: t.reportes.descPropiedades, href: "/admin/reportes/propiedades", icon: "🏠" },
  ]
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t.reportes.titulo}</h1>
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
