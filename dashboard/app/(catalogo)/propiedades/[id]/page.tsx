"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ArrowLeft, MapPin, Home, Users, Calendar } from "lucide-react"
import type { Propiedad, PropiedadImagen } from "@/lib/types/database"

const categorias = [
  { value: "sala", label: "Sala", icon: "🛋" },
  { value: "cocina", label: "Cocina", icon: "🍳" },
  { value: "habitacion", label: "Habitación", icon: "🛏" },
  { value: "bano", label: "Baño", icon: "🚿" },
  { value: "fachada", label: "Fachada", icon: "🏠" },
  { value: "otra", label: "Otra", icon: "📷" },
]

export default function PropiedadDetallePage() {
  const params = useParams()
  const router = useRouter()
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)
  const [imagenes, setImagenes] = useState<PropiedadImagen[]>([])
  const [loading, setLoading] = useState(true)
  const [imagenActiva, setImagenActiva] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/propiedades/${params.id}`).then((res) => res.json()),
      fetch(`/api/propiedades/${params.id}/imagenes`).then((res) => res.json()),
    ])
      .then(([propData, imgData]) => {
        setPropiedad(propData)
        setImagenes(imgData)
      })
      .catch(() => {
        setPropiedad(null)
      })
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return <p className="text-muted-foreground">Cargando propiedad...</p>
  }

  if (!propiedad) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Propiedad no encontrada</CardTitle>
          <CardDescription>La propiedad que buscas no existe.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <button onClick={() => router.push("/catalogo")}>Volver al catálogo</button>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  const imagenesPorCategoria = categorias.reduce((acc, cat) => {
    acc[cat.value] = imagenes.filter((img) => img.categoria === cat.value)
    return acc
  }, {} as Record<string, PropiedadImagen[]>)

  return (
    <div>
      {/* Header con botón volver */}
      <div className="mb-6">
        <Button variant="ghost" size="icon" asChild>
          <button onClick={() => router.push("/catalogo")}>
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Button>
      </div>

      {/* Información principal */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Imagen destacada */}
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              {imagenes[0] ? (
                <img
                  src={imagenes[0].url_publica}
                  alt="Imagen principal"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">
                  🏠
                </div>
              )}
            </div>

            {/* Detalles */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{propiedad.direccion}</h2>
                <p className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {propiedad.barrio}, {propiedad.ciudad}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{propiedad.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Área</p>
                  <p className="font-medium">{propiedad.area} m²</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Habitaciones</p>
                  <p className="font-medium">{propiedad.habitaciones}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Baños</p>
                  <p className="font-medium">{propiedad.banos}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Canon de arriendo</p>
                <p className="text-3xl font-bold text-primary">
                  {formatPeso(propiedad.valor_arriendo)}
                  <span className="text-base font-normal">/mes</span>
                </p>
              </div>

              {propiedad.descripcion && (
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="text-sm">{propiedad.descripcion}</p>
                </div>
              )}

              <Button size="lg" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Solicitar visita
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Galería de imágenes por categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Galería de fotos</CardTitle>
          <CardDescription>
            {imagenes.length} foto{imagenes.length !== 1 ? "s" : ""} disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sala">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              {categorias.map((cat) => {
                const count = (imagenesPorCategoria[cat.value] || []).length
                return (
                  <TabsTrigger
                    key={cat.value}
                    value={cat.value}
                    className="relative"
                    disabled={count === 0}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.label}
                    {count > 0 && (
                      <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {categorias.map((cat) => {
              const imagenesCategoria = imagenesPorCategoria[cat.value] || []
              if (imagenesCategoria.length === 0) return null

              return (
                <TabsContent key={cat.value} value={cat.value} className="mt-4">
                  {imagenesCategoria.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay fotos en esta categoría
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagenesCategoria.map((imagen) => (
                        <div
                          key={imagen.id}
                          className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition"
                          onClick={() => setImagenActiva(imagen.url_publica)}
                        >
                          <img
                            src={imagen.url_publica}
                            alt={`${cat.label} - ${imagen.nombre_archivo}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de imagen activa (lightbox) */}
      {imagenActiva && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImagenActiva(null)}
        >
          <div className="relative max-w-5xl max-h-full">
            <button
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
              onClick={() => setImagenActiva(null)}
            >
              ✕ Cerrar
            </button>
            <img
              src={imagenActiva}
              alt="Imagen ampliada"
              className="max-h-[90vh] w-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
