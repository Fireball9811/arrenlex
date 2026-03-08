"use client"

import { Suspense, useEffect, useState } from "react"
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
import { useLang } from "@/lib/i18n/context"

type PropiedadPublica = {
  id: string
  area: number
  descripcion: string | null
  imagen_principal: string | null
}

function CatalogoContent() {
  const { t } = useLang()
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
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
          <Link href="/">
            {t.catalogo.volverInicio}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-6">{t.catalogo.titulo}</h1>

        {/* Selector de ciudad */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!ciudadSeleccionada ? "default" : "outline"}
            onClick={() => setCiudadSeleccionada("")}
          >
            {t.catalogo.todasCiudades}
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
        <p className="text-muted-foreground">{t.catalogo.cargando}</p>
      ) : !ciudadSeleccionada ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.catalogo.seleccionaCiudad}</CardTitle>
            <CardDescription>
              {t.catalogo.seleccionaDescripcion}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : propiedades.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.catalogo.sinPropiedades}</CardTitle>
            <CardDescription>
              {t.catalogo.sinPropiedadesDesc.replace("{ciudad}", ciudadSeleccionada)}
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
                <CardTitle className="text-lg">{t.catalogo.tamano}: {propiedad.area} m²</CardTitle>
                {propiedad.descripcion ? (
                  <CardDescription className="line-clamp-3">
                    {propiedad.descripcion}
                  </CardDescription>
                ) : (
                  <CardDescription>{t.catalogo.sinDescripcion}</CardDescription>
                )}
              </CardHeader>

              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/catalogo/propiedades/${propiedad.id}`} onClick={(e) => e.stopPropagation()}>
                    {t.catalogo.verDetalle}
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

export default function CatalogoPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
      <CatalogoContent />
    </Suspense>
  )
}
