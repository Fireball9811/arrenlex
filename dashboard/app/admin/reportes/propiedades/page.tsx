"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminReportesPropiedadesPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/reportes" className="text-sm text-muted-foreground hover:underline">← Volver a Reportes</Link>
        <h1 className="mt-2 text-3xl font-bold">Reporte Propiedades</h1>
        <p className="text-muted-foreground">Contenido en construcción.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Propiedades</CardTitle><CardDescription>Estado de propiedades.</CardDescription></CardHeader>
      </Card>
    </div>
  )
}
