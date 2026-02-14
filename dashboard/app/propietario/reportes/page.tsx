"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PropietarioReportesPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Reportes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Reportes</CardTitle>
          <CardDescription>Ver reportes. Contenido en construcción.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/reportes" className="text-sm text-primary hover:underline">Ver versión anterior (reportes)</Link>
        </CardContent>
      </Card>
    </div>
  )
}
