"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PropietarioNuevoPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Nuevo Arrendatario</h1>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Arrendatario</CardTitle>
          <CardDescription>Registrar nuevo arrendatario. Contenido en construcción.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/nuevo" className="text-sm text-primary hover:underline">Ver versión anterior (nuevo)</Link>
        </CardContent>
      </Card>
    </div>
  )
}
