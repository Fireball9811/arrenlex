"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PropietarioPropiedadesPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Propiedades</h1>
      <Card>
        <CardHeader>
          <CardTitle>Propiedades</CardTitle>
          <CardDescription>Gestiona tus propiedades. Contenido en construcción.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/propiedades" className="text-sm text-primary hover:underline">Ver versión anterior (propiedades)</Link>
        </CardContent>
      </Card>
    </div>
  )
}
