"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FileText, Calendar, Home, User } from "lucide-react"
import Link from "next/link"

type Contrato = {
  id: string
  propiedades: {
    direccion: string
    ciudad: string
    barrio: string
  }
  arrendatarios: {
    nombre: string
    cedula: string
  }
  fecha_inicio: string
  fecha_fin: string
  canon_mensual: number
  estado: string
}

export default function MisContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchContratos = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Buscar contratos donde el usuario es el arrendatario
        const { data } = await supabase
          .from("contratos")
          .select(`
            *,
            propiedades (direccion, ciudad, barrio),
            arrendatarios (nombre, cedula)
          `)
          .or(`arrendatarios.cedula.eq.${user.email}`)

        setContratos(data || [])
      }
      setLoading(false)
    }
    fetchContratos()
  }, [])

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  const estadoColors: Record<string, string> = {
    borrador: "bg-gray-100 text-gray-800",
    activo: "bg-green-100 text-green-800",
    terminado: "bg-blue-100 text-blue-800",
    vencido: "bg-red-100 text-red-800",
  }

  const estadoLabels: Record<string, string> = {
    borrador: "Borrador",
    activo: "Activo",
    terminado: "Terminado",
    vencido: "Vencido",
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando contratos...</p>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Contratos</h1>
          <p className="text-muted-foreground">
            Contratos de arrendamiento donde tú eres el arrendatario
          </p>
        </div>
      </div>

      {contratos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin contratos</CardTitle>
            <CardDescription>
              Aún no tienes contratos registrados. Cuando un propietario cree un contrato contigo, aparecerá aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/catalogo">Ver Propiedades Disponibles</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contratos.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{c.propiedades?.direccion}</CardTitle>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${estadoColors[c.estado] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {estadoLabels[c.estado] || c.estado}
                  </span>
                </div>
                <CardDescription>
                  {c.propiedades?.ciudad} · {c.propiedades?.barrio}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{c.arrendatarios?.nombre}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDate(c.fecha_inicio)} - {formatDate(c.fecha_fin)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="h-4 w-4" />
                  <span>{c.propiedades?.ciudad}</span>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Canon mensual:</p>
                  <p className="text-lg font-semibold">{formatPeso(c.canon_mensual)}</p>
                </div>

                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/catalogo/propiedades/${c.propiedades?.id || c.id}`}>
                      Ver Propiedad
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
