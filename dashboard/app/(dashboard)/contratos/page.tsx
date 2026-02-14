"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ContratoConRelaciones } from "@/lib/types/database"

export default function ContratosPage() {
  const [contratos, setContratos] = useState<ContratoConRelaciones[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/contratos")
      .then((res) => res.json())
      .then(setContratos)
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este contrato?")) return
    const res = await fetch(`/api/contratos/${id}`, { method: "DELETE" })
    if (res.ok) {
      setContratos((prev) => prev.filter((c) => c.id !== id))
    }
  }

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Contratos</h1>
        <Button asChild>
          <Link href="/contratos/nuevo">Nuevo contrato</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando contratos...</p>
      ) : contratos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin contratos</CardTitle>
            <CardDescription>
              Aún no hay contratos registrados. Crea el primero.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/contratos/nuevo">Nuevo contrato</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contratos.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{c.propiedad?.direccion}</CardTitle>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${estadoColors[c.estado] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {estadoLabels[c.estado] || c.estado}
                  </span>
                </div>
                <CardDescription>
                  {c.arrendatario?.nombre} · {c.propiedad?.ciudad}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Inicio:</p>
                    <p className="font-medium">{formatDate(c.fecha_inicio)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fin:</p>
                    <p className="font-medium">{formatDate(c.fecha_fin)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Canon mensual:</p>
                  <p className="text-lg font-semibold">{formatPeso(c.canon_mensual)}</p>
                </div>
              </CardContent>
              <div className="flex gap-2 p-4 pt-0">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/contratos/${c.id}`}>Ver</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/contratos/${c.id}/editar`}>Editar</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleDelete(c.id)}
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
