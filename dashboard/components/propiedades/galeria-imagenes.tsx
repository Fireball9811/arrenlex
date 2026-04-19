"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Upload, Image as ImageIcon, Loader2, AlertCircle, Video, CheckCircle2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { uploadImageToSupabase } from "@/lib/supabase-storage"
import type { PropiedadImagen, PropiedadVideo } from "@/lib/types/database"

// ─── Constantes ────────────────────────────────────────────────────────────
const FORMATOS_FOTO = "image/jpeg,image/jpg,image/png,image/webp"
const FORMATOS_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-msvideo"
const FOTO_MAX_MB = 20
const FOTO_MAX_BYTES = FOTO_MAX_MB * 1024 * 1024
const VIDEO_MAX_MB = 50
const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024
const VIDEO_MAX_MINUTOS = 12

// ─── Categorías de imágenes ────────────────────────────────────────────────
type CategoriaValue =
  | "principal" | "fachada" | "sala" | "sala_estar" | "comedor" | "cocina"
  | "habitacion" | "bano" | "zona_lavado" | "parqueadero" | "deposito" | "otra"

const categorias: Array<{
  value: CategoriaValue
  label: string
  icon: string
  destacada?: boolean
  maxFotos?: number
  descripcion?: string
}> = [
  { value: "principal",   label: "Foto Principal",      icon: "⭐", destacada: true, maxFotos: 1, descripcion: "La primera imagen que verán los posibles inquilinos. Elige la mejor." },
  { value: "fachada",     label: "Fachada / Entrada",   icon: "🏠", descripcion: "Exterior del edificio o entrada." },
  { value: "sala",        label: "Sala",                icon: "🛋", descripcion: "Sala principal." },
  { value: "sala_estar",  label: "Sala de Estar",       icon: "🪑", descripcion: "Sala de estar o zona de descanso." },
  { value: "comedor",     label: "Comedor",             icon: "🍽️", descripcion: "Área de comedor." },
  { value: "cocina",      label: "Cocina",              icon: "🍳", descripcion: "Cocina y zona de preparación." },
  { value: "habitacion",  label: "Habitación",          icon: "🛏", descripcion: "Dormitorio(s) de la propiedad." },
  { value: "bano",        label: "Baño",                icon: "🚿", descripcion: "Baño(s) de la propiedad." },
  { value: "zona_lavado", label: "Zona de Lavado",      icon: "🫧", descripcion: "Lavandería, zona de lavado o cuarto de ropas." },
  { value: "parqueadero", label: "Parqueadero",         icon: "🚗", descripcion: "Zona de parqueo asignada." },
  { value: "deposito",    label: "Depósito",            icon: "📦", descripcion: "Depósito o cuarto de almacenamiento." },
  { value: "otra",        label: "Otra",                icon: "📷", descripcion: "Zonas comunes, terraza, balcón, etc." },
]

// ─── Props ─────────────────────────────────────────────────────────────────
type Props = {
  propiedadId: string
  imagenes: PropiedadImagen[]
  onImagenesChange: (imagenes: PropiedadImagen[]) => void
  readonly?: boolean
}

// ─── Componente ────────────────────────────────────────────────────────────
export function GaleríaImagenes({ propiedadId, imagenes, onImagenesChange, readonly = false }: Props) {
  // Estado de imágenes
  const [subiendoCategoria, setSubiendoCategoria] = useState<CategoriaValue | null>(null)
  const [dragOverCategoria, setDragOverCategoria] = useState<CategoriaValue | null>(null)
  const [erroresImg, setErroresImg] = useState<Partial<Record<CategoriaValue, string>>>({})
  const dragCounters = useRef<Partial<Record<CategoriaValue, number>>>({})

  // Estado del video
  const [video, setVideo] = useState<PropiedadVideo | null>(null)
  const [cargandoVideo, setCargandoVideo] = useState(true)
  const [subiendoVideo, setSubiendoVideo] = useState(false)
  const [progresoVideo, setProgresoVideo] = useState(0)
  const [errorVideo, setErrorVideo] = useState<string | null>(null)
  const [dragOverVideo, setDragOverVideo] = useState(false)
  const dragCounterVideo = useRef(0)

  // Cargar video actual al montar
  useEffect(() => {
    fetch(`/api/propiedades/${propiedadId}/video`)
      .then((r) => r.json())
      .then((data) => setVideo(data ?? null))
      .catch(() => setVideo(null))
      .finally(() => setCargandoVideo(false))
  }, [propiedadId])

  // ─── Helpers de errores ──────────────────────────────────────────────────
  const setErrorImg = (cat: CategoriaValue, msg: string | null) => {
    setErroresImg((prev) => {
      if (msg === null) { const n = { ...prev }; delete n[cat]; return n }
      return { ...prev, [cat]: msg }
    })
  }

  // ─── Upload de imágenes (directo a Supabase desde el cliente) ───────────
  const handleSubirFoto = useCallback(
    async (archivos: FileList | File[] | null, categoria: CategoriaValue) => {
      if (!archivos || archivos.length === 0) return
      setErrorImg(categoria, null)

      const catDef = categorias.find((c) => c.value === categoria)
      const actuales = imagenes.filter((img) => img.categoria === categoria)

      if (catDef?.maxFotos && actuales.length >= catDef.maxFotos) {
        setErrorImg(categoria, `Solo se permite ${catDef.maxFotos} foto aquí. Elimina la actual antes de subir otra.`)
        return
      }

      const lista = Array.from(archivos)
      for (const f of lista) {
        if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type)) {
          setErrorImg(categoria, `"${f.name}" no es un formato válido. Usa JPG, PNG o WebP.`)
          return
        }
        if (f.size > FOTO_MAX_BYTES) {
          setErrorImg(categoria, `"${f.name}" supera el límite de ${FOTO_MAX_MB} MB.`)
          return
        }
      }

      const disponibles = catDef?.maxFotos ? catDef.maxFotos - actuales.length : lista.length
      const aSubir = lista.slice(0, disponibles)

      setSubiendoCategoria(categoria)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setErrorImg(categoria, "Debes iniciar sesión para subir imágenes.")
          return
        }

        const nuevasImagenes: PropiedadImagen[] = []

        for (const archivo of aSubir) {
          // Subir directamente a Supabase Storage
          const { url, path } = await uploadImageToSupabase(archivo, propiedadId, categoria, user.id)

          // Registrar en la base de datos vía API
          const res = await fetch(`/api/propiedades/${propiedadId}/imagenes/registrar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoria,
              nombre_archivo: archivo.name,
              url_publica: url,
            }),
          })

          if (!res.ok) {
            const err = await res.json()
            setErrorImg(categoria, err.error || "Error al registrar la imagen.")
            // Revertir subida
            await supabase.storage.from("propiedades").remove([path])
            return
          }

          const imagen = await res.json()
          nuevasImagenes.push(imagen)
        }

        onImagenesChange([...imagenes, ...nuevasImagenes])
      } catch {
        setErrorImg(categoria, "Error de red al subir la imagen.")
      } finally {
        setSubiendoCategoria(null)
        document.querySelectorAll<HTMLInputElement>(`input[data-categoria="${categoria}"]`)
          .forEach((el) => { el.value = "" })
      }
    },
    [propiedadId, imagenes, onImagenesChange]
  )

  const handleEliminarFoto = async (id: string) => {
    if (!confirm("¿Eliminar esta imagen?")) return
    try {
      const res = await fetch(`/api/propiedades/imagenes/${id}`, { method: "DELETE" })
      if (res.ok) onImagenesChange(imagenes.filter((img) => img.id !== id))
    } catch {
      alert("Error al eliminar la imagen.")
    }
  }

  // ─── Drag & drop para fotos ──────────────────────────────────────────────
  const handleImgDragEnter = (e: React.DragEvent, cat: CategoriaValue) => {
    e.preventDefault(); e.stopPropagation()
    dragCounters.current[cat] = (dragCounters.current[cat] ?? 0) + 1
    if (dragCounters.current[cat] === 1) setDragOverCategoria(cat)
  }
  const handleImgDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }
  const handleImgDragLeave = (e: React.DragEvent, cat: CategoriaValue) => {
    e.preventDefault(); e.stopPropagation()
    dragCounters.current[cat] = Math.max((dragCounters.current[cat] ?? 1) - 1, 0)
    if (dragCounters.current[cat] === 0) setDragOverCategoria(null)
  }
  const handleImgDrop = (e: React.DragEvent, cat: CategoriaValue) => {
    e.preventDefault(); e.stopPropagation()
    dragCounters.current[cat] = 0
    setDragOverCategoria(null)
    if (!readonly && e.dataTransfer.files.length > 0) handleSubirFoto(e.dataTransfer.files, cat)
  }

  // ─── Upload de video (directo a Supabase desde el cliente) ───────────────
  const subirVideo = useCallback(async (archivo: File) => {
    setErrorVideo(null)

    // Validar formato
    const formatsOk = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
    if (!formatsOk.includes(archivo.type)) {
      setErrorVideo("Formato no válido. Usa MP4, WebM o MOV.")
      return
    }
    // Validar tamaño
    if (archivo.size > VIDEO_MAX_BYTES) {
      setErrorVideo(`El video supera el límite de ${VIDEO_MAX_MB} MB.`)
      return
    }

    // Validar duración
    await new Promise<void>((resolve) => {
      const url = URL.createObjectURL(archivo)
      const vid = document.createElement("video")
      vid.preload = "metadata"
      vid.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        const durMin = vid.duration / 60
        if (durMin > VIDEO_MAX_MINUTOS) {
          setErrorVideo(`El video dura ${durMin.toFixed(1)} min. El máximo permitido es ${VIDEO_MAX_MINUTOS} minutos.`)
          resolve()
          return
        }
        resolve()
      }
      vid.onerror = () => { URL.revokeObjectURL(url); resolve() }
      vid.src = url
    })

    if (errorVideo) return

    setSubiendoVideo(true)
    setProgresoVideo(0)

    try {
      const supabase = createClient()
      const ext = archivo.name.split(".").pop() ?? "mp4"
      const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
      const storagePath = `${propiedadId}/${safeFileName}`

      // Upload directo al bucket con seguimiento de progreso
      const { error: uploadError } = await supabase.storage
        .from("propiedades-videos")
        .upload(storagePath, archivo, {
          cacheControl: "3600",
          upsert: false,
          // @ts-expect-error onUploadProgress es soportado en runtime
          onUploadProgress: (evt: { loaded: number; total: number }) => {
            setProgresoVideo(Math.round((evt.loaded / evt.total) * 100))
          },
        })

      if (uploadError) {
        setErrorVideo(uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from("propiedades-videos")
        .getPublicUrl(storagePath)

      // Guardar en BD via API
      const res = await fetch(`/api/propiedades/${propiedadId}/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_archivo: archivo.name, url_publica: publicUrl, storage_path: storagePath }),
      })

      if (!res.ok) {
        const err = await res.json()
        setErrorVideo(err.error || "Error al guardar el video.")
        // Revertir subida
        await supabase.storage.from("propiedades-videos").remove([storagePath])
        return
      }

      const videoData = await res.json()
      setVideo(videoData)
    } catch {
      setErrorVideo("Error de red al subir el video.")
    } finally {
      setSubiendoVideo(false)
      setProgresoVideo(0)
      document.querySelectorAll<HTMLInputElement>("input[data-video]")
        .forEach((el) => { el.value = "" })
    }
  }, [propiedadId, errorVideo])

  const handleEliminarVideo = async () => {
    if (!confirm("¿Eliminar el video de esta propiedad?")) return
    try {
      const res = await fetch(`/api/propiedades/${propiedadId}/video`, { method: "DELETE" })
      if (res.ok) setVideo(null)
      else {
        const err = await res.json()
        setErrorVideo(err.error || "Error al eliminar el video.")
      }
    } catch {
      setErrorVideo("Error de red al eliminar el video.")
    }
  }

  // ─── Drag & drop para video ──────────────────────────────────────────────
  const handleVideoDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterVideo.current += 1
    if (dragCounterVideo.current === 1) setDragOverVideo(true)
  }
  const handleVideoDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }
  const handleVideoDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterVideo.current = Math.max(dragCounterVideo.current - 1, 0)
    if (dragCounterVideo.current === 0) setDragOverVideo(false)
  }
  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterVideo.current = 0
    setDragOverVideo(false)
    if (readonly || subiendoVideo) return
    const files = e.dataTransfer.files
    if (files.length > 0) subirVideo(files[0])
  }

  const imagenesPorCategoria = categorias.reduce((acc, cat) => {
    acc[cat.value] = imagenes.filter((img) => img.categoria === cat.value)
    return acc
  }, {} as Record<string, PropiedadImagen[]>)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Especificaciones globales */}
      {!readonly && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Requisitos de los archivos</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>Fotos: JPG, PNG, WebP · máx. {FOTO_MAX_MB} MB · mínimo 1200×800 px recomendado</li>
            <li>Video: MP4, WebM, MOV · máx. {VIDEO_MAX_MINUTOS} min · máx. {VIDEO_MAX_MB} MB</li>
            <li>Arrastra y suelta los archivos directamente en cada sección</li>
          </ul>
        </div>
      )}

      {/* ── Sección Video General ── */}
      <Card
        onDragEnter={handleVideoDragEnter}
        onDragOver={handleVideoDragOver}
        onDragLeave={handleVideoDragLeave}
        onDrop={handleVideoDrop}
        className={cn(
          "transition-all duration-150 border-2 border-purple-300",
          dragOverVideo && !readonly && "ring-2 ring-purple-500 ring-offset-2 bg-purple-50 scale-[1.01]"
        )}
      >
        <CardHeader className="bg-purple-50 rounded-t-lg pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-purple-900">
              <Video className="h-5 w-5" />
              Video General
              <span className="text-xs font-normal bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                Máx. {VIDEO_MAX_MINUTOS} min · Solo 1
              </span>
            </CardTitle>
            {subiendoVideo && (
              <span className="flex items-center gap-1 text-sm text-purple-700 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progresoVideo < 100 ? `${progresoVideo}%` : "Guardando..."}
              </span>
            )}
            {video && !subiendoVideo && (
              <span className="flex items-center gap-1 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Video cargado
              </span>
            )}
          </div>
          <p className="text-xs text-purple-700 mt-0.5">
            Recorrido o presentación general de la propiedad. Formatos: MP4, WebM, MOV.
          </p>
        </CardHeader>

        <CardContent className="pt-3">
          {errorVideo && (
            <div className="flex items-start gap-2 mb-3 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorVideo}</span>
            </div>
          )}

          {/* Barra de progreso */}
          {subiendoVideo && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Subiendo video...</span>
                <span>{progresoVideo}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progresoVideo}%` }}
                />
              </div>
            </div>
          )}

          {cargandoVideo ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Cargando video...</span>
            </div>
          ) : video ? (
            /* Video existente */
            <div className="space-y-3">
              <video
                src={video.url_publica}
                controls
                className="w-full rounded-lg border max-h-64 bg-black"
                preload="metadata"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground truncate max-w-[70%]">{video.nombre_archivo}</p>
                {!readonly && (
                  <button
                    type="button"
                    onClick={handleEliminarVideo}
                    className="flex items-center gap-1 text-xs text-destructive hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar video
                  </button>
                )}
              </div>
              {!readonly && (
                <label className={cn(
                  "flex items-center justify-center gap-2 w-full py-2 rounded-lg border-2 border-dashed cursor-pointer text-sm transition-colors",
                  dragOverVideo
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-muted-foreground/25 text-muted-foreground hover:border-purple-400 hover:text-purple-700"
                )}>
                  <Upload className="h-4 w-4" />
                  Reemplazar video
                  <input
                    data-video
                    type="file"
                    accept={FORMATOS_VIDEO_ACCEPT}
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && subirVideo(e.target.files[0])}
                  />
                </label>
              )}
            </div>
          ) : (
            /* Zona de drop cuando no hay video */
            <label
              className={cn(
                "flex flex-col items-center justify-center w-full py-10 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                dragOverVideo && !readonly
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-muted-foreground/25 text-muted-foreground hover:border-purple-400 hover:bg-muted/50",
                (readonly || subiendoVideo) && "cursor-default pointer-events-none"
              )}
            >
              {subiendoVideo ? (
                <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-2" />
              ) : (
                <Video className={cn("h-10 w-10 mb-2", dragOverVideo && "text-purple-500")} />
              )}
              <p className="text-sm font-medium">
                {dragOverVideo ? "Suelta aquí para subir" : readonly ? "Sin video" : "Arrastra o haz clic para subir el video"}
              </p>
              {!readonly && !dragOverVideo && (
                <p className="text-xs mt-1">MP4, WebM, MOV · máx. {VIDEO_MAX_MINUTOS} min · máx. {VIDEO_MAX_MB} MB</p>
              )}
              {!readonly && (
                <input
                  data-video
                  type="file"
                  accept={FORMATOS_VIDEO_ACCEPT}
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && subirVideo(e.target.files[0])}
                />
              )}
            </label>
          )}
        </CardContent>
      </Card>

      {/* ── Categorías de imágenes ── */}
      {categorias.map((cat) => {
        const imagenesCategoria = imagenesPorCategoria[cat.value] || []
        const isUploading = subiendoCategoria === cat.value
        const isDragOver = dragOverCategoria === cat.value && !readonly
        const errorMsg = erroresImg[cat.value]
        const lleno = cat.maxFotos ? imagenesCategoria.length >= cat.maxFotos : false

        return (
          <Card
            key={cat.value}
            onDragEnter={(e) => handleImgDragEnter(e, cat.value)}
            onDragOver={handleImgDragOver}
            onDragLeave={(e) => handleImgDragLeave(e, cat.value)}
            onDrop={(e) => handleImgDrop(e, cat.value)}
            className={cn(
              "transition-all duration-150",
              cat.destacada && "border-amber-400 border-2",
              isDragOver && "ring-2 ring-primary ring-offset-2 border-primary bg-primary/5 scale-[1.01]"
            )}
          >
            <CardHeader className={cn("pb-2", cat.destacada && "bg-amber-50 rounded-t-lg")}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span>{cat.icon}</span>
                  {cat.label}
                  {cat.destacada && (
                    <span className="text-xs font-normal bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                      Solo 1 foto
                    </span>
                  )}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({imagenesCategoria.length}{cat.maxFotos ? `/${cat.maxFotos}` : ""})
                  </span>
                </CardTitle>
                {isUploading && (
                  <span className="flex items-center gap-1 text-sm text-primary animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo...
                  </span>
                )}
              </div>
              {cat.descripcion && (
                <p className="text-xs text-muted-foreground mt-0.5">{cat.descripcion}</p>
              )}
            </CardHeader>

            <CardContent className="pt-2">
              {errorMsg && (
                <div className="flex items-start gap-2 mb-3 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {imagenesCategoria.length === 0 ? (
                <label
                  htmlFor={`file-input-${cat.value}`}
                  className={cn(
                    "flex flex-col items-center justify-center w-full py-10 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                    isDragOver
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/25 text-muted-foreground hover:border-primary/50 hover:bg-muted/50",
                    readonly && "cursor-default pointer-events-none"
                  )}
                >
                  {isUploading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                  ) : (
                    <ImageIcon className={cn("h-10 w-10 mb-2", isDragOver && "text-primary")} />
                  )}
                  <p className="text-sm font-medium">
                    {isDragOver ? "Suelta aquí para subir" : readonly ? "Sin fotos" : "Arrastra o haz clic para subir"}
                  </p>
                  {!readonly && !isDragOver && (
                    <p className="text-xs mt-1">JPG, PNG, WebP · máx. {FOTO_MAX_MB} MB</p>
                  )}
                  {!readonly && (
                    <input
                      id={`file-input-${cat.value}`}
                      data-categoria={cat.value}
                      type="file"
                      accept={FORMATOS_FOTO}
                      multiple={!cat.maxFotos || cat.maxFotos > 1}
                      className="hidden"
                      onChange={(e) => handleSubirFoto(e.target.files, cat.value)}
                    />
                  )}
                </label>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {imagenesCategoria.map((imagen) => (
                    <div key={imagen.id} className="group relative aspect-square">
                      <img
                        src={imagen.url_publica}
                        alt={cat.label}
                        className="h-full w-full object-cover rounded-lg border"
                      />
                      {!readonly && (
                        <button
                          type="button"
                          onClick={() => handleEliminarFoto(imagen.id)}
                          className="absolute top-1.5 right-1.5 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-md"
                          title="Eliminar foto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {!readonly && !lleno && (
                    <label
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                        isDragOver
                          ? "border-primary bg-primary/10"
                          : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
                      )}
                      title="Agregar foto"
                    >
                      {isUploading ? (
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      ) : (
                        <>
                          <Upload className="h-7 w-7 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Agregar</span>
                        </>
                      )}
                      <input
                        data-categoria={cat.value}
                        type="file"
                        accept={FORMATOS_FOTO}
                        multiple={!cat.maxFotos || cat.maxFotos > 1}
                        className="hidden"
                        onChange={(e) => handleSubirFoto(e.target.files, cat.value)}
                      />
                    </label>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
