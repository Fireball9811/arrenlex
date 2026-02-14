"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PropietarioGestionPagosPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/propietario/reportes" className="text-sm text-muted-foreground hover:underline">← Volver a Reportes</Link>
        <h1 className="mt-2 text-3xl font-bold">Gestión de Pagos</h1>
        <p className="text-muted-foreground">Ver pagos. Contenido en construcción.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Pagos</CardTitle>
          <CardDescription>Ver todos los pagos del sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/reportes/gestion-pagos" className="text-sm text-primary hover:underline">Ver versión anterior</Link>
        </CardContent>
      </Card>
    </div>
  )
}
