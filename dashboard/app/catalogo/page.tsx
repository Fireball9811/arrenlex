"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  descripcion: string | null
  imagen_principal: string | null
}

export default function CatalogoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ciudades, setCiudades] = useState<string[]>([])
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState<string>("")
  const [propiedades, setPropiedades] = useState<PropiedadPublica[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar ciudades disponibles y preseleccionar desde ?ciudad= si viene de la landing
  useEffect(() => {
    const ciudadFromUrl = searchParams.get("ciudad")
    fetch("/api/propiedades/ciudades")
      .then((res) => res.json())
      .then((data: string[]) => {
        const list = Array.isArray(data) ? data : []
        setCiudades(list)
        if (ciudadFromUrl && list.includes(ciudadFromUrl)) {
          setCiudadSeleccionada(ciudadFromUrl)
        } else if (list.length > 0) {
          setCiudadSeleccionada(list[0])
        }
      })
      .finally(() => setLoading(false))
  }, [searchParams])

  // Cargar propiedades cuando se selecciona ciudad (API pública: solo descripcion, area, imagen)
  useEffect(() => {
    if (!ciudadSeleccionada) return

    setLoading(true)
    fetch(`/api/propiedades/public?ciudad=${encodeURIComponent(ciudadSeleccionada)}`)
      .then((res) => res.json())
      .then((data: PropiedadPublica[]) => {
        setPropiedades(Array.isArray(data) ? data : [])
      })
      .finally(() => setLoading(false))
  }, [ciudadSeleccionada])

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
              {/* Foto de portada */}
              <div className="aspect-video w-full bg-muted relative">
                {propiedad.imagen_principal ? (
                  <img
                    src={propiedad.imagen_principal}
                    alt="Imagen de propiedad"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    🏠
                  </div>
                )}
              </div>

              <CardHeader>
                <CardTitle className="text-lg">Tamaño: {propiedad.area} m²</CardTitle>
                {propiedad.descripcion ? (
                  <CardDescription className="line-clamp-3">
                    {propiedad.descripcion}
                  </CardDescription>
                ) : (
                  <CardDescription>Sin descripción</CardDescription>
                )}
              </CardHeader>

              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/catalogo/propiedades/${propiedad.id}`} onClick={(e) => e.stopPropagation()}>
                    Ver detalle
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
