"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, CreditCard, User, FileText } from "lucide-react"

export default function InquilinoDashboardPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  if (loading) return <p className="text-muted-foreground">Cargando...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard de Inquilino</h1>
        <p className="text-muted-foreground">Bienvenido. Selecciona una opción.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer transition hover:shadow-lg">
          <Link href="/catalogo">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3"><Home className="h-8 w-8 text-primary" /></div>
                <div>
                  <CardTitle>Propiedades</CardTitle>
                  <CardDescription>Ver propiedades disponibles</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>
        <Card className="cursor-pointer transition hover:shadow-lg">
          <Link href="/inquilino/pagos">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-3"><CreditCard className="h-8 w-8 text-green-600" /></div>
                <div>
                  <CardTitle>Mis Pagos</CardTitle>
                  <CardDescription>Ver historial de pagos</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>
        <Card className="cursor-pointer transition hover:shadow-lg">
          <Link href="/inquilino/mis-datos">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-3"><User className="h-8 w-8 text-blue-600" /></div>
                <div>
                  <CardTitle>Mis Datos</CardTitle>
                  <CardDescription>Actualizar mi información</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>
        <Card className="cursor-pointer transition hover:shadow-lg">
          <Link href="/inquilino/mis-contratos">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-3"><FileText className="h-8 w-8 text-amber-600" /></div>
                <div>
                  <CardTitle>Mis Contratos</CardTitle>
                  <CardDescription>Ver mis contratos</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}
