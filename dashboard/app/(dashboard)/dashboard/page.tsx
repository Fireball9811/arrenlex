"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { UserRole } from "@/lib/auth/role"
import { Home, CreditCard, User, FileText, Building2, FileCheck, Mail, Users, BarChart3 } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirectTo, setRedirectTo] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/dashboard")
      .then((res) => res.json())
      .then((data: { redirect?: string; role?: UserRole } | null) => {
        const redirect = data?.redirect || "/login"
        if (redirect !== "/dashboard") {
          setRedirectTo(redirect)
          return
        }
        setRole((data?.role as UserRole) ?? "inquilino")
        setLoading(false)
      })
      .catch(() => router.replace("/login"))
  }, [router])

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo)
  }, [redirectTo, router])

  if (redirectTo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const isAdmin = role === "admin"
  const isPropietario = role === "propietario"
  const isInquilino = role === "inquilino"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {isInquilino ? "Dashboard de Inquilino" : isAdmin ? "Panel de Administración" : "Panel de Propietario"}
        </h1>
        <p className="text-muted-foreground">
          {isInquilino ? "Bienvenido. Selecciona una opción." : "Selecciona una sección para continuar."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {(isAdmin || isPropietario) && (
          <>
            {isAdmin && (
              <Link href="/usuarios">
                <Card className="h-full transition hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Usuarios</CardTitle>
                        <CardDescription>Gestionar usuarios</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )}
            <Link href="/dashboard">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <BarChart3 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Dashboard</CardTitle>
                      <CardDescription>Panel principal</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/propiedades">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Propiedades</CardTitle>
                      <CardDescription>Gestionar propiedades</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/contratos">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <FileCheck className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Contratos</CardTitle>
                      <CardDescription>Ver y crear contratos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/invitaciones">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Invitaciones</CardTitle>
                      <CardDescription>Invitar inquilinos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/nuevo">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Nuevo Arrendatario</CardTitle>
                      <CardDescription>Registrar nuevo arrendatario</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/reportes/gestion-pagos">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <CreditCard className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Gestión de Pagos</CardTitle>
                      <CardDescription>Ver pagos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/reportes">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <BarChart3 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Reportes</CardTitle>
                      <CardDescription>Ver reportes</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </>
        )}

        {isInquilino && (
          <>
            <Link href="/catalogo">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Home className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Ver Propiedades</CardTitle>
                      <CardDescription>Propiedades disponibles</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/reportes/mis-pagos">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <CreditCard className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Mis Pagos</CardTitle>
                      <CardDescription>Ver historial de pagos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/nuevo">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Mis Datos</CardTitle>
                      <CardDescription>Actualizar mi información</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/mis-contratos">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-amber-500/10 p-3">
                      <FileText className="h-8 w-8 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle>Mis Contratos</CardTitle>
                      <CardDescription>Ver mis contratos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
