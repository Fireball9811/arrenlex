"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, CreditCard, User, FileText } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

export default function InquilinoDashboardPage() {
  const { t } = useLang()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  if (loading) return <p className="text-muted-foreground">{t.comun.cargando}</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.dashboard.inquilino.titulo}</h1>
        <p className="text-muted-foreground">{t.dashboard.inquilino.bienvenido}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer transition hover:shadow-lg">
          <Link href="/catalogo">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3"><Home className="h-8 w-8 text-primary" /></div>
                <div>
                  <CardTitle>{t.dashboard.inquilino.propiedades}</CardTitle>
                  <CardDescription>{t.dashboard.inquilino.verPropiedades}</CardDescription>
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
                  <CardTitle>{t.dashboard.inquilino.misPagos}</CardTitle>
                  <CardDescription>{t.dashboard.inquilino.verPagos}</CardDescription>
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
                  <CardTitle>{t.dashboard.inquilino.misDatos}</CardTitle>
                  <CardDescription>{t.dashboard.inquilino.actualizarInfo}</CardDescription>
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
                  <CardTitle>{t.dashboard.inquilino.misContratos}</CardTitle>
                  <CardDescription>{t.dashboard.inquilino.verContratos}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}
