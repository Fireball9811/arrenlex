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
import { useLang } from "@/lib/i18n/context"

export default function FinancieroPage() {
  const { t } = useLang()

  const reportes = [
    {
      title: t.reportes.historialPagos,
      description: t.reportes.descHistorial,
      href: "/reportes/financiero/historial",
      icon: "📋",
      color: "bg-blue-50 border-blue-200",
    },
    {
      title: t.reportes.pendientesPagar,
      description: t.reportes.descPendientes,
      href: "/reportes/financiero/pendientes",
      icon: "⏳",
      color: "bg-amber-50 border-amber-200",
    },
    {
      title: t.mantenimiento.rentabilidad.cardTitulo,
      description: t.mantenimiento.rentabilidad.cardDesc,
      href: "/reportes/financiero/rentabilidad",
      icon: "📊",
      color: "bg-green-50 border-green-200",
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          {t.reportes.volverReportes}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{t.reportes.finTitulo}</h1>
        <p className="text-muted-foreground">
          {t.reportes.finDesc}
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
                <Link href={reporte.href}>{t.reportes.abrir}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
