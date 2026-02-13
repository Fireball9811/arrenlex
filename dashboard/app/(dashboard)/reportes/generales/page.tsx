"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function GeneralesPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Reportes Generales</h1>
        <p className="text-muted-foreground">
          Resumen general del sistema
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>💰 Ingresos Mensuales</CardTitle>
            <CardDescription>Total de arriendos del mes actual</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">$28.8M</p>
            <p className="text-sm text-green-600">↑ 12% vs mes anterior</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>🏠 Propiedades Activas</CardTitle>
            <CardDescription>Total de propiedades en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">31</p>
            <p className="text-sm text-muted-foreground">propiedades</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle>👥 Personas Activas</CardTitle>
            <CardDescription>Total de usuarios registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">65</p>
            <p className="text-sm text-muted-foreground">usuarios</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📈 Tasa de Ocupación</CardTitle>
            <CardDescription>Porcentaje de propiedades arrendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">77%</p>
            <p className="text-sm text-muted-foreground">24 de 31 propiedades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>⏳ Pagos Pendientes</CardTitle>
            <CardDescription>Pagos por aprobar o en proceso</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">8</p>
            <p className="text-sm text-muted-foreground">$9.6M en pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📅 Reporte Mensual</CardTitle>
            <CardDescription>Resumen mensual completo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Generar reporte...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 Reporte Anual</CardTitle>
            <CardDescription>Comparativa año tras año</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Generar reporte...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📥 Exportar Datos</CardTitle>
            <CardDescription>Descargar información en Excel/CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Exportar...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>⚙️ Configuración</CardTitle>
            <CardDescription>Configurar reportes automáticos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Configurar...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
