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
import type { Propiedad } from "@/lib/types/database"

export default function PropiedadesPage() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/propiedades")
      .then((res) => res.json())
      .then(setPropiedades)
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta propiedad?")) return
    const res = await fetch(`/api/propiedades/${id}`, { method: "DELETE" })
    if (res.ok) {
      setPropiedades((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  const estadoColors: Record<string, string> = {
    disponible: "bg-green-100 text-green-800",
    arrendado: "bg-blue-100 text-blue-800",
    mantenimiento: "bg-amber-100 text-amber-800",
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Propiedades</h1>
        <Button asChild>
          <Link href="/propiedades/nuevo">Nueva propiedad</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando propiedades...</p>
      ) : propiedades.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin propiedades</CardTitle>
            <CardDescription>
              Aún no hay propiedades registradas. Crea la primera.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/propiedades/nuevo">Nueva propiedad</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {propiedades.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{p.direccion}</CardTitle>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${estadoColors[p.estado] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {p.estado}
                  </span>
                </div>
                <CardDescription>
                  {p.barrio}, {p.ciudad} · {p.tipo}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>🛏 {p.habitaciones} hab</span>
                  <span>🚿 {p.banos} baños</span>
                  <span>📐 {p.area} m²</span>
                </div>
                <p className="text-lg font-semibold">{formatPeso(p.valor_arriendo)}</p>
                {p.descripcion && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{p.descripcion}</p>
                )}
              </CardContent>
              <div className="flex gap-2 p-4 pt-0">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/propiedades/${p.id}/editar`}>Editar</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleDelete(p.id)}
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
