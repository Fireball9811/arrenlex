"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type PropiedadPublica = {
  id: string
  area: number
  imagen_principal: string | null
}

export function InicioPropiedades() {
  const searchParams = useSearchParams()
  const ciudad = searchParams.get("ciudad")
  const [propiedades, setPropiedades] = useState<PropiedadPublica[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ciudad) {
      setPropiedades([])
      return
    }
    setLoading(true)
    fetch(`/api/propiedades/public?ciudad=${encodeURIComponent(ciudad)}`)
      .then((res) => res.json())
      .then((data: PropiedadPublica[]) => setPropiedades(Array.isArray(data) ? data : []))
      .catch(() => setPropiedades([]))
      .finally(() => setLoading(false))
  }, [ciudad])

  if (!ciudad) {
    return (
      <>
        <section className="mb-16">
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-6 py-12 text-center">
            <p className="text-muted-foreground">
              Selecciona una ciudad para ver las propiedades disponibles.
            </p>
          </div>
        </section>
        <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-2 font-semibold text-card-foreground">Arrendar</h2>
            <p className="text-sm text-muted-foreground">
              Publica y encuentra propiedades disponibles para arrendamiento.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-2 font-semibold text-card-foreground">Gestionar</h2>
            <p className="text-sm text-muted-foreground">
              Administra contratos, pagos y documentación en un solo lugar.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-2 font-semibold text-card-foreground">Confiabilidad</h2>
            <p className="text-sm text-muted-foreground">
              Proceso transparente y seguro para arrendadores y arrendatarios.
            </p>
          </div>
        </section>
      </>
    )
  }

  if (loading) {
    return (
      <section className="mb-16">
        <p className="text-center text-muted-foreground">Cargando propiedades...</p>
      </section>
    )
  }

  if (propiedades.length === 0) {
    return (
      <section className="mb-16">
        <Card>
          <CardHeader>
            <CardTitle>Sin propiedades</CardTitle>
            <CardDescription>
              No hay propiedades disponibles en {ciudad} en este momento.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    )
  }

  return (
    <section className="mb-16">
      <h2 className="mb-6 text-xl font-semibold text-card-foreground">
        Propiedades en {ciudad}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {propiedades.map((propiedad) => (
          <Card
            key={propiedad.id}
            className="overflow-hidden flex flex-col"
          >
            <div className="aspect-video w-full bg-muted relative shrink-0">
              {propiedad.imagen_principal ? (
                <img
                  src={propiedad.imagen_principal}
                  alt="Imagen de propiedad"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground text-4xl">
                  🏠
                </div>
              )}
            </div>
            <CardContent className="flex flex-col gap-4 flex-1 pt-6">
              <p className="text-lg font-medium text-card-foreground">
                {propiedad.area} m²
              </p>
              <Button asChild className="mt-auto w-full">
                <Link href={`/catalogo/propiedades/${propiedad.id}`}>Ver detalle</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
