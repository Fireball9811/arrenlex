"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PropiedadConImagenes } from "@/lib/types/database"

type PropiedadCard = PropiedadConImagenes & {
  imagen_principal?: string
}

export default function CatalogoPage() {
  const router = useRouter()
  const [ciudades, setCiudades] = useState<string[]>([])
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState<string>("")
  const [propiedades, setPropiedades] = useState<PropiedadCard[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar ciudades disponibles
  useEffect(() => {
    fetch("/api/propiedades/ciudades")
      .then((res) => res.json())
      .then((data: string[]) => {
        setCiudades(data)
        if (data.length > 0) {
          setCiudadSeleccionada(data[0])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  // Cargar propiedades cuando se selecciona ciudad
  useEffect(() => {
    if (!ciudadSeleccionada) return

    setLoading(true)
    fetch(`/api/propiedades?ciudad=${encodeURIComponent(ciudadSeleccionada)}`)
      .then((res) => res.json())
      .then(async (data: PropiedadConImagenes[]) => {
        // Para cada propiedad, cargar su imagen principal
        const propiedadesConImagenes = await Promise.all(
          data.map(async (prop) => {
            const res = await fetch(`/api/propiedades/${prop.id}/imagenes`)
            const imagenes = await res.json()
            return {
              ...prop,
              imagen_principal: imagenes[0]?.url_publica,
            }
          })
        )
        setPropiedades(propiedadesConImagenes)
      })
      .finally(() => setLoading(false))
  }, [ciudadSeleccionada])

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-6">Catálogo de Propiedades</h1>

        {/* Selector de ciudad */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!ciudadSeleccionada ? "default" : "outline"}
            onClick={() => setCiudadSeleccionada("")}
          >
            Todas las ciudades
          </Button>
          {ciudades.map((ciudad) => (
            <Button
              key={ciudad}
              variant={ciudadSeleccionada === ciudad ? "default" : "outline"}
              onClick={() => setCiudadSeleccionada(ciudad)}
            >
              {ciudad}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando propiedades...</p>
      ) : !ciudadSeleccionada ? (
        <Card>
          <CardHeader>
            <CardTitle>Selecciona una ciudad</CardTitle>
            <CardDescription>
              Selecciona una ciudad del listado para ver las propiedades disponibles.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : propiedades.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin propiedades</CardTitle>
            <CardDescription>
              No hay propiedades disponibles en {ciudadSeleccionada} en este momento.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {propiedades.map((propiedad) => (
            <Card
              key={propiedad.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition"
              onClick={() => router.push(`/catalogo/propiedades/${propiedad.id}`)}
            >
              {/* Imagen principal */}
              <div className="aspect-video w-full bg-muted relative">
                {propiedad.imagen_principal ? (
                  <img
                    src={propiedad.imagen_principal}
                    alt={propiedad.direccion}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    🏠
                  </div>
                )}
              </div>

              <CardHeader>
                <CardTitle className="text-lg line-clamp-1">
                  {propiedad.direccion}
                </CardTitle>
                <CardDescription>
                  {propiedad.barrio}, {propiedad.ciudad}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                  <span>🛏 {propiedad.habitaciones} hab</span>
                  <span>🚿 {propiedad.banos} baños</span>
                  <span>📐 {propiedad.area} m²</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatPeso(propiedad.valor_arriendo)}
                  <span className="text-sm font-normal text-muted-foreground">/mes</span>
                </p>
                {propiedad.descripcion && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {propiedad.descripcion}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
