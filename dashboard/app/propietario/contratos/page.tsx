"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PropietarioContratosPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Contratos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Contratos</CardTitle>
          <CardDescription>Gestiona contratos. Contenido en construcción.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/contratos" className="text-sm text-primary hover:underline">Ver versión anterior (contratos)</Link>
        </CardContent>
      </Card>
    </div>
  )
}
