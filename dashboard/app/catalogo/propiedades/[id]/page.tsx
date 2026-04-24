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
import {
  ArrowLeft,
  Bath,
  Bed,
  Calendar,
  ClipboardList,
  Map as MapIcon,
  MapPin,
  Package,
  Ruler,
  Car,
  Building2,
} from "lucide-react"

const TIPO_LABELS: Record<string, string> = {
  apartaestudio: "Apartaestudio",
  apartamento: "Apartamento",
  bodega: "Bodega",
  casa: "Casa",
  casaquinta: "Casa Quinta",
  deposito: "Depósito",
  finca: "Finca",
  glamping: "Glamping",
  habitacion: "Habitación",
  local: "Local",
  lote: "Lote",
  oficina: "Oficina",
  parqueadero: "Parqueadero",
}

const HORARIOS_VISITA = [
  { value: "08:00", label: "8:00 AM" },
  { value: "08:30", label: "8:30 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "09:30", label: "9:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "13:30", label: "1:30 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "14:30", label: "2:30 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "15:30", label: "3:30 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "16:30", label: "4:30 PM" },
]

function getTodayString() {
  const d = new Date()
  return d.toISOString().split("T")[0]
}

type PropiedadImagenPublica = {
  id: string
  url_publica: string
  categoria: string
  orden: number
  nombre_archivo: string
}

type PropiedadDetallePublico = {
  id: string
  titulo: string | null
  tipo: string | null
  descripcion: string | null
  area: number
  direccion: string | null
  barrio: string | null
  ciudad: string | null
  habitaciones: number | null
  banos: number | null
  ascensor: number | null
  depositos: number | null
  parqueaderos: number | null
  numero_matricula: string | null
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
  const [fechaVisita, setFechaVisita] = useState("")
  const [horaVisita, setHoraVisita] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Estado para generación de token de aplicación
  const [generandoToken, setGenerandoToken] = useState(false)
  const [errorToken, setErrorToken] = useState<string | null>(null)

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

  async function handleDiligenciarAplicacion() {
    setGenerandoToken(true)
    setErrorToken(null)
    try {
      const res = await fetch("/api/intake/tokens/publico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedad_id: params.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorToken(data.error ?? "No se pudo iniciar la aplicación. Intenta de nuevo.")
        return
      }
      // Redirigir directo al formulario con el token
      window.location.href = `/catalogo/propiedades/${params.id}/aplicacion?token=${data.token}`
    } catch {
      setErrorToken("Error de conexión. Verifica tu internet e intenta de nuevo.")
    } finally {
      setGenerandoToken(false)
    }
  }

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

  const imagenMapa = propiedad.imagenes.find((img) => img.categoria === "mapa") ?? null
  const imagenes = propiedad.imagenes.filter((img) => img.categoria !== "mapa")
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
      setFechaVisita("")
      setHoraVisita("")
      setSubmitMessage(null)
    }
  }

  const handleSubmitSolicitud = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMessage(null)
    try {
      const fechaHoraVisita =
        fechaVisita && horaVisita
          ? new Date(`${fechaVisita}T${horaVisita}:00`).toISOString()
          : undefined

      const res = await fetch("/api/solicitudes-visita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_completo: nombreCompleto.trim(),
          celular: celular.trim(),
          email: email.trim(),
          propiedad_id: params.id,
          nota: nota.trim() || undefined,
          fecha_visita: fechaHoraVisita,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitMessage({ type: "error", text: data.error ?? "Error al enviar la solicitud" })
        return
      }
      const emailSent = data.emailSent !== false
      setSubmitMessage({
        type: emailSent ? "success" : "error",
        text: data.message || "Solicitud enviada. Nos pondremos en contacto contigo.",
      })
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

      {/* ─── Bloque 1: Información del inmueble ─────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-5">
          {/* Título + tipo + matrícula */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {propiedad.titulo && (
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                  {propiedad.titulo}
                </h1>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {propiedad.tipo && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {TIPO_LABELS[propiedad.tipo] ?? propiedad.tipo}
                  </span>
                )}
                {propiedad.tipo && propiedad.numero_matricula && (
                  <span className="text-muted-foreground/60">·</span>
                )}
                {propiedad.numero_matricula && (
                  <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 font-semibold px-2 py-0.5 rounded">
                    {propiedad.numero_matricula}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dirección */}
          {propiedad.direccion && (
            <div className="flex items-start gap-2 text-base font-medium">
              <MapPin className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
              <span>
                {propiedad.direccion}
                {propiedad.barrio ? `, ${propiedad.barrio}` : ""}
                {propiedad.ciudad ? `, ${propiedad.ciudad}` : ""}
              </span>
            </div>
          )}

          {/* Specs en fila con íconos */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm border-t border-b py-3">
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{propiedad.area}</span>
              <span className="text-muted-foreground">m²</span>
            </span>
            {propiedad.habitaciones !== null && propiedad.habitaciones > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{propiedad.habitaciones}</span>
                <span className="text-muted-foreground">
                  {propiedad.habitaciones === 1 ? "habitación" : "habitaciones"}
                </span>
              </span>
            )}
            {propiedad.banos !== null && propiedad.banos > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Bath className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{propiedad.banos}</span>
                <span className="text-muted-foreground">
                  {propiedad.banos === 1 ? "baño" : "baños"}
                </span>
              </span>
            )}
            {propiedad.parqueaderos !== null && propiedad.parqueaderos > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{propiedad.parqueaderos}</span>
                <span className="text-muted-foreground">
                  {propiedad.parqueaderos === 1 ? "parqueadero" : "parqueaderos"}
                </span>
              </span>
            )}
            {propiedad.depositos !== null && propiedad.depositos > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{propiedad.depositos}</span>
                <span className="text-muted-foreground">
                  {propiedad.depositos === 1 ? "depósito" : "depósitos"}
                </span>
              </span>
            )}
            {propiedad.ascensor !== null && propiedad.ascensor > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{propiedad.ascensor}</span>
                <span className="text-muted-foreground">
                  {propiedad.ascensor === 1 ? "ascensor" : "ascensores"}
                </span>
              </span>
            )}
          </div>

          {/* Descripción */}
          {propiedad.descripcion && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Descripción</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {propiedad.descripcion}
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <Button size="lg" className="w-full" onClick={openModal}>
              <Calendar className="mr-2 h-4 w-4" />
              Solicitar visita
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-cyan-500 text-cyan-700 hover:bg-cyan-50"
              onClick={handleDiligenciarAplicacion}
              disabled={generandoToken}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              {generandoToken ? "Preparando formulario…" : "Diligenciar Aplicación"}
            </Button>
          </div>

          {errorToken && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {errorToken}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Bloque 2: Portada + Mapa (lado a lado) ────────────────────── */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Foto de portada */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Foto principal
              </p>
              <div
                className="aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition border"
                onClick={() =>
                  imagenes[0] && setImagenActiva(imagenes[0].url_publica)
                }
              >
                {imagenes[0] ? (
                  <img
                    src={imagenes[0].url_publica}
                    alt="Foto principal del inmueble"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-6xl">
                    🏠
                  </div>
                )}
              </div>
            </div>

            {/* Mapa / Ubicación */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Ubicación y alrededores
              </p>
              {imagenMapa ? (
                <>
                  <div
                    className="aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition bg-muted"
                    onClick={() => setImagenActiva(imagenMapa.url_publica)}
                  >
                    <img
                      src={imagenMapa.url_publica}
                      alt="Mapa de ubicación del inmueble"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {propiedad.direccion && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${propiedad.direccion}${propiedad.ciudad ? `, ${propiedad.ciudad}` : ""}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-cyan-700 hover:underline"
                    >
                      Abrir en Google Maps →
                    </a>
                  )}
                </>
              ) : (
                <div className="aspect-video rounded-lg bg-muted border border-dashed flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center">
                  <MapIcon className="h-10 w-10" />
                  <p className="text-sm font-medium">Mapa no disponible</p>
                  {propiedad.direccion && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${propiedad.direccion}${propiedad.ciudad ? `, ${propiedad.ciudad}` : ""}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-700 hover:underline"
                    >
                      Ver ubicación en Google Maps →
                    </a>
                  )}
                </div>
              )}
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
              {/* Selección de fecha */}
              <div>
                <label htmlFor="fecha-visita" className="block text-sm font-medium mb-1">
                  Fecha de visita <span className="text-destructive">*</span>
                </label>
                <input
                  id="fecha-visita"
                  type="date"
                  value={fechaVisita}
                  onChange={(e) => setFechaVisita(e.target.value)}
                  min={getTodayString()}
                  required
                  disabled={submitting}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Selección de hora */}
              <div>
                <label htmlFor="hora-visita" className="block text-sm font-medium mb-1">
                  Hora de visita <span className="text-destructive">*</span>
                </label>
                <select
                  id="hora-visita"
                  value={horaVisita}
                  onChange={(e) => setHoraVisita(e.target.value)}
                  required
                  disabled={submitting}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecciona una hora</option>
                  {HORARIOS_VISITA.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nota opcional */}
              <div>
                <label htmlFor="nota" className="block text-sm font-medium mb-1">
                  Nota (opcional)
                </label>
                <textarea
                  id="nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Comentario adicional"
                  disabled={submitting}
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
