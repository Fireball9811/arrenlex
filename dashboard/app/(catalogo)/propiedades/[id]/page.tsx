"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
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
import { Input } from "@/components/ui/input"
import { ArrowLeft, Calendar } from "lucide-react"

type PropiedadImagenPublica = {
  id: string
  url_publica: string
  categoria: string
  orden: number
  nombre_archivo: string
}

type PropiedadDetallePublico = {
  id: string
  descripcion: string | null
  area: number
  imagenes: PropiedadImagenPublica[]
}

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
  const [propiedad, setPropiedad] = useState<PropiedadDetallePublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [imagenActiva, setImagenActiva] = useState<string | null>(null)
  const [modalSolicitarVisita, setModalSolicitarVisita] = useState(false)
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [celular, setCelular] = useState("")
  const [email, setEmail] = useState("")
  const [nota, setNota] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch(`/api/propiedades/${params.id}/public`)
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data: PropiedadDetallePublico | null) => {
        setPropiedad(data ?? null)
      })
      .catch(() => setPropiedad(null))
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
            <Link href="/catalogo">Volver al catálogo</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const imagenes = propiedad.imagenes
  const imagenesPorCategoria = categorias.reduce((acc, cat) => {
    acc[cat.value] = imagenes.filter((img) => img.categoria === cat.value)
    return acc
  }, {} as Record<string, PropiedadImagenPublica[]>)

  const openModal = () => {
    setSubmitMessage(null)
    setModalSolicitarVisita(true)
  }

  const closeModal = () => {
    if (!submitting) {
      setModalSolicitarVisita(false)
      setNombreCompleto("")
      setCelular("")
      setEmail("")
      setNota("")
      setSubmitMessage(null)
    }
  }

  const handleSubmitSolicitud = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMessage(null)
    try {
      const res = await fetch("/api/solicitudes-visita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_completo: nombreCompleto.trim(),
          celular: celular.trim(),
          email: email.trim(),
          propiedad_id: params.id,
          nota: nota.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitMessage({ type: "error", text: data.error ?? "Error al enviar la solicitud" })
        return
      }
      setSubmitMessage({ type: "success", text: "Solicitud enviada. Nos pondremos en contacto contigo." })
      setTimeout(() => {
        closeModal()
      }, 1500)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Header con botón volver */}
      <div className="mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/catalogo">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      {/* Información pública: solo descripcion, tamaño y fotos */}
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

            {/* Solo descripcion y tamaño (sin dirección, renta ni propietario) */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Tamaño</p>
                <p className="text-2xl font-bold">{propiedad.area} m²</p>
              </div>

              {propiedad.descripcion && (
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="text-sm">{propiedad.descripcion}</p>
                </div>
              )}

              <Button size="lg" className="w-full" onClick={openModal}>
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

      {/* Modal Solicitar visita */}
      {modalSolicitarVisita && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-background rounded-lg shadow-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Solicitar visita</h2>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={closeModal}
                disabled={submitting}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitSolicitud} className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium mb-1">
                  Nombre completo
                </label>
                <Input
                  id="nombre"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  required
                  placeholder="Tu nombre completo"
                  disabled={submitting}
                />
              </div>
              <div>
                <label htmlFor="celular" className="block text-sm font-medium mb-1">
                  Número celular
                </label>
                <Input
                  id="celular"
                  type="tel"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  required
                  placeholder="Ej. 300 123 4567"
                  disabled={submitting}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@correo.com"
                  disabled={submitting}
                />
              </div>
              <div>
                <label htmlFor="nota" className="block text-sm font-medium mb-1">
                  Nota (opcional)
                </label>
                <textarea
                  id="nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Comentario o preferencia de horario"
                  disabled={submitting}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {submitMessage && (
                <p
                  className={
                    submitMessage.type === "success"
                      ? "text-sm text-green-600"
                      : "text-sm text-destructive"
                  }
                >
                  {submitMessage.text}
                </p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enviando…" : "Enviar solicitud"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
