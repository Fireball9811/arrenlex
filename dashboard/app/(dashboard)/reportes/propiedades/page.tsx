"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ReportesPropiedadesPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Reportes de Propiedades</h1>
        <p className="text-muted-foreground">
          Estado, ocupación e información de propiedades
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>✅ Disponibles</CardTitle>
            <CardDescription>Propiedades listas para arrendar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">5</p>
            <p className="text-sm text-muted-foreground">propiedades</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>🔵 Arrendadas</CardTitle>
            <CardDescription>Propiedades con contrato activo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">propiedades</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle>🔧 En Mantenimiento</CardTitle>
            <CardDescription>Propiedades no disponibles temporalmente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">2</p>
            <p className="text-sm text-muted-foreground">propiedades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 Tasa de Ocupación</CardTitle>
            <CardDescription>Porcentaje de propiedades arrendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">77%</p>
            <p className="text-sm text-muted-foreground">de 31 propiedades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>💰 Ingresos por Propiedad</CardTitle>
            <CardDescription>Promedio de ingreso mensual por inmueble</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">$1.2M</p>
            <p className="text-sm text-muted-foreground">promedio mensual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🏢 Inventario Completo</CardTitle>
            <CardDescription>Listado de todas las propiedades con detalles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Ver inventario...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
