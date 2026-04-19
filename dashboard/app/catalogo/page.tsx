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
  numero_matricula?: string
  habitaciones?: number
  banos?: number
  ascensor?: number
  depositos?: number
  parqueaderos?: number
}

function CatalogoContent() {
  const { t } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ciudades, setCiudades] = useState<string[]>([])
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState<string>("")
  const [propiedades, setPropiedades] = useState<PropiedadPublica[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)

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

  // Cargar propiedades cuando cambia la ciudad — reinicia la paginación
  useEffect(() => {
    if (!ciudadSeleccionada) return

    setLoading(true)
    setPropiedades([])
    setNextCursor(null)
    fetch(`/api/propiedades/public?ciudad=${encodeURIComponent(ciudadSeleccionada)}`)
      .then((res) => res.json())
      .then((data: { propiedades: PropiedadPublica[]; nextCursor: string | null }) => {
        setPropiedades(Array.isArray(data.propiedades) ? data.propiedades : [])
        setNextCursor(data.nextCursor ?? null)
      })
      .finally(() => setLoading(false))
  }, [ciudadSeleccionada])

  async function cargarMas() {
    if (!nextCursor || !ciudadSeleccionada) return
    setCargandoMas(true)
    try {
      const res = await fetch(
        `/api/propiedades/public?ciudad=${encodeURIComponent(ciudadSeleccionada)}&cursor=${encodeURIComponent(nextCursor)}`
      )
      const data: { propiedades: PropiedadPublica[]; nextCursor: string | null } = await res.json()
      setPropiedades((prev) => [...prev, ...(data.propiedades ?? [])])
      setNextCursor(data.nextCursor ?? null)
    } finally {
      setCargandoMas(false)
    }
  }

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
        <>
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

                <CardHeader className="pb-2">
                  {propiedad.numero_matricula && (
                    <div className="bg-blue-50 border border-blue-200 px-3 py-1 rounded inline-block mb-2">
                      <p className="text-xs text-blue-600 font-semibold">{propiedad.numero_matricula}</p>
                    </div>
                  )}
                  <CardTitle className="text-lg">{t.catalogo.tamano}: {propiedad.area} m²</CardTitle>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mt-2">
                    <span>🛏 {propiedad.habitaciones || 0} hab</span>
                    <span>🚿 {propiedad.banos || 0} baños</span>
                    <span>🛗 {propiedad.ascensor || 0} asc</span>
                    <span>📦 {propiedad.depositos || 0} dep</span>
                    <span>🚗 {propiedad.parqueaderos || 0} parq</span>
                  </div>
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

          {nextCursor && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={cargarMas}
                disabled={cargandoMas}
                className="min-w-[200px]"
              >
                {cargandoMas ? "Cargando..." : "Ver más propiedades"}
              </Button>
            </div>
          )}
        </>
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
