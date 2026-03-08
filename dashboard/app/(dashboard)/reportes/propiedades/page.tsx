"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLang } from "@/lib/i18n/context"

export default function ReportesPropiedadesPage() {
  const { t } = useLang()

  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          {t.reportes.volverReportes}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{t.reportes.propiedadesReporteTitulo}</h1>
        <p className="text-muted-foreground">
          {t.reportes.propiedadesReporteDesc}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>{t.reportes.propiedadesCards.disponibles}</CardTitle>
            <CardDescription>{t.reportes.propiedadesCards.descDisponibles}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">5</p>
            <p className="text-sm text-muted-foreground">{t.reportes.propiedadesCards.disponibles}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>{t.reportes.propiedadesCards.arrendadas}</CardTitle>
            <CardDescription>{t.reportes.propiedadesCards.descArrendadas}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">{t.reportes.generalesCards.propiedades}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle>{t.reportes.propiedadesCards.enMantenimiento}</CardTitle>
            <CardDescription>{t.reportes.propiedadesCards.descMantenimiento}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">2</p>
            <p className="text-sm text-muted-foreground">{t.reportes.generalesCards.propiedades}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.propiedadesCards.tasaOcupacion}</CardTitle>
            <CardDescription>{t.reportes.propiedadesCards.descTasa}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">77%</p>
            <p className="text-sm text-muted-foreground">de 31 {t.reportes.generalesCards.propiedades}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.propiedadesCards.ingresosPorProp}</CardTitle>
            <CardDescription>{t.reportes.propiedadesCards.descIngresos}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">$1.2M</p>
            <p className="text-sm text-muted-foreground">{t.reportes.propiedadesCards.promedioMensual}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.propiedadesCards.inventario}</CardTitle>
            <CardDescription>{t.reportes.propiedadesCards.descInventario}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t.reportes.propiedadesCards.verInventario}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
