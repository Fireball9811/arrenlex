"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Upload, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PropiedadImagen } from "@/lib/types/database"

const categorias: Array<{ value: CategoriaValue; label: string; icon: string }> = [
  { value: "sala", label: "Sala", icon: "🛋" },
  { value: "cocina", label: "Cocina", icon: "🍳" },
  { value: "habitacion", label: "Habitación", icon: "🛏" },
  { value: "bano", label: "Baño", icon: "🚿" },
  { value: "fachada", label: "Fachada", icon: "🏠" },
  { value: "otra", label: "Otra", icon: "📷" },
]

type CategoriaValue = "sala" | "cocina" | "habitacion" | "bano" | "fachada" | "otra"

type Props = {
  propiedadId: string
  imagenes: PropiedadImagen[]
  onImagenesChange: (imagenes: PropiedadImagen[]) => void
  readonly?: boolean
}

export function GaleríaImagenes({ propiedadId, imagenes, onImagenesChange, readonly = false }: Props) {
  const [subiendoCategoria, setSubiendoCategoria] = useState<CategoriaValue | null>(null)
  const [dragOverCategoria, setDragOverCategoria] = useState<CategoriaValue | null>(null)

  const handleSubir = useCallback(async (archivos: FileList | File[] | null, categoria: CategoriaValue) => {
    if (!archivos || archivos.length === 0) return

    setSubiendoCategoria(categoria)

    try {
      const formData = new FormData()
      formData.append("propiedad_id", propiedadId)
      formData.append("categoria", categoria)

      // Agregar cada archivo
      for (const archivo of Array.from(archivos)) {
        formData.append("archivo", archivo)
      }

      const res = await fetch("/api/propiedades/imagenes", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Error al subir imágenes")
        return
      }

      const data = await res.json()
      // data es ahora un array de imágenes
      onImagenesChange([...imagenes, ...data])
    } finally {
      setSubiendoCategoria(null)
      // Reset inputs de esta categoría
      const inputs = document.querySelectorAll(`input[data-categoria="${categoria}"]`) as NodeListOf<HTMLInputElement>
      inputs.forEach((input) => {
        if (input) input.value = ""
      })
    }
  }, [propiedadId, imagenes, onImagenesChange])

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta imagen?")) return

    try {
      const res = await fetch(`/api/propiedades/imagenes/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        onImagenesChange(imagenes.filter((img) => img.id !== id))
      }
    } catch (error) {
      console.error("Error eliminando imagen:", error)
      alert("Error al eliminar imagen")
    }
  }

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent, categoria: CategoriaValue) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverCategoria(categoria)
  }

  const handleDragLeave = (e: React.DragEvent, categoria: CategoriaValue) => {
    e.preventDefault()
    e.stopPropagation()
    // Solo limpiar si estamos saliendo de la tarjeta, no de un hijo
    if (e.currentTarget === e.target) {
      setDragOverCategoria(null)
    }
  }

  const handleDrop = (e: React.DragEvent, categoria: CategoriaValue) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverCategoria(null)

    if (readonly) return

    const archivos = e.dataTransfer.files
    if (archivos.length > 0) {
      handleSubir(archivos, categoria)
    }
  }

  const imagenesPorCategoria = categorias.reduce((acc, cat) => {
    acc[cat.value] = imagenes.filter((img) => img.categoria === cat.value)
    return acc
  }, {} as Record<string, PropiedadImagen[]>)

  return (
    <div className="space-y-6">
      {categorias.map((cat) => {
        const imagenesCategoria = imagenesPorCategoria[cat.value] || []
        const isUploading = subiendoCategoria === cat.value
        const isDragOver = dragOverCategoria === cat.value

        return (
          <Card
            key={cat.value}
            onDragOver={(e) => handleDragOver(e, cat.value)}
            onDragLeave={(e) => handleDragLeave(e, cat.value)}
            onDrop={(e) => handleDrop(e, cat.value)}
            className={cn(
              "transition-all",
              isDragOver && !readonly && "border-primary border-2 bg-primary/5"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.label}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({imagenesCategoria.length})
                  </span>
                </CardTitle>
                {isUploading && (
                  <span className="text-sm text-primary animate-pulse">
                    Subiendo...
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {imagenesCategoria.length === 0 ? (
                <div
                  className={cn(
                    "text-center py-8 text-muted-foreground transition-colors",
                    isDragOver && !readonly && "bg-primary/10 rounded-lg"
                  )}
                >
                  <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No hay fotos en esta categoría</p>
                  {!readonly && (
                    <>
                      <label
                        htmlFor={`file-input-${cat.value}`}
                        className="inline-flex items-center gap-2 mt-4 cursor-pointer text-primary hover:underline"
                      >
                        <Upload className="h-4 w-4" />
                        Subir primera foto
                        <input
                          id={`file-input-${cat.value}`}
                          data-categoria={cat.value}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          multiple
                          className="hidden"
                          onChange={(e) => handleSubir(e.target.files, cat.value)}
                        />
                      </label>
                      <p className="text-xs mt-2 text-muted-foreground">
                        o arrastra las fotos aquí
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imagenesCategoria.map((imagen) => (
                    <div key={imagen.id} className="group relative aspect-square">
                      <img
                        src={imagen.url_publica}
                        alt={`${cat.label} - ${imagen.nombre_archivo}`}
                        className="h-full w-full object-cover rounded-lg border"
                      />
                      {!readonly && (
                        <button
                          onClick={() => handleEliminar(imagen.id)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!readonly && (
                    <label
                      className={cn(
                        "aspect-square flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-muted transition",
                        isDragOver && "border-primary bg-primary/10"
                      )}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <input
                        id={`file-input-more-${cat.value}`}
                        data-categoria={cat.value}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => handleSubir(e.target.files, cat.value)}
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
