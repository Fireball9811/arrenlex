"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLang } from "@/lib/i18n/context"

export default function GeneralesPage() {
  const { t } = useLang()

  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          {t.reportes.volverReportes}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{t.reportes.generalesTitulo}</h1>
        <p className="text-muted-foreground">
          {t.reportes.descGenerales}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>{t.reportes.generalesCards.ingresosMensuales}</CardTitle>
            <CardDescription>{t.reportes.generalesCards.descIngresos}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">$28.8M</p>
            <p className="text-sm text-green-600">↑ 12% vs mes anterior</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>{t.reportes.generalesCards.propiedadesActivas}</CardTitle>
            <CardDescription>{t.reportes.generalesCards.descPropActivas}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">31</p>
            <p className="text-sm text-muted-foreground">{t.reportes.generalesCards.propiedades}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle>{t.reportes.generalesCards.personasActivas}</CardTitle>
            <CardDescription>{t.reportes.generalesCards.descPersonasActivas}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">65</p>
            <p className="text-sm text-muted-foreground">{t.reportes.generalesCards.usuarios}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.generalesCards.tasaOcupacion}</CardTitle>
            <CardDescription>{t.reportes.generalesCards.descTasaOcupacion}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">77%</p>
            <p className="text-sm text-muted-foreground">24 de 31 propiedades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.generalesCards.pagosPendientes}</CardTitle>
            <CardDescription>{t.reportes.generalesCards.descPagosPendientes}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">8</p>
            <p className="text-sm text-muted-foreground">$9.6M en pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.generalesCards.reporteMensual}</CardTitle>
            <CardDescription>{t.reportes.generalesCards.descMensual}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t.reportes.generalesCards.generarReporte}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.generalesCards.reporteAnual}</CardTitle>
            <CardDescription>{t.reportes.generalesCards.descAnual}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t.reportes.generalesCards.generarReporte}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.generalesCards.exportarDatos}</CardTitle>
            <CardDescription>{t.reportes.generalesCards.descExportar}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t.reportes.generalesCards.exportar}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.generalesCards.configuracion}</CardTitle>
            <CardDescription>{t.reportes.generalesCards.descConfiguracion}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t.reportes.generalesCards.configurar}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
