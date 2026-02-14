"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Upload, Image as ImageIcon } from "lucide-react"
import type { PropiedadImagen } from "@/lib/types/database"

const categorias = [
  { value: "sala", label: "Sala", icon: "🛋" },
  { value: "cocina", label: "Cocina", icon: "🍳" },
  { value: "habitacion", label: "Habitación", icon: "🛏" },
  { value: "bano", label: "Baño", icon: "🚿" },
  { value: "fachada", label: "Fachada", icon: "🏠" },
  { value: "otra", label: "Otra", icon: "📷" },
]

type Props = {
  propiedadId: string
  imagenes: PropiedadImagen[]
  onImagenesChange: (imagenes: PropiedadImagen[]) => void
  readonly?: boolean
}

export function GaleríaImagenes({ propiedadId, imagenes, onImagenesChange, readonly = false }: Props) {
  const [subiendo, setSubiendo] = useState(false)
  const [categoriaActiva, setCategoriaActiva] = useState<"sala" | "cocina" | "habitacion" | "bano" | "fachada" | "otra">("sala")

  async function handleSubir(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return

    setSubiendo(true)
    const formData = new FormData()
    formData.append("propiedad_id", propiedadId)
    formData.append("categoria", categoriaActiva)

    // Subir cada archivo
    for (const archivo of Array.from(archivos)) {
      formData.append("archivo", archivo)
    }

    try {
      const res = await fetch("/api/propiedades/imagenes", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || "Error al subir imagen")
        continue
      }

      const data = await res.json()
      onImagenesChange([...imagenes, data])
    } catch (error) {
      console.error("Error subiendo imagen:", error)
      alert("Error al subir imagen")
    } finally {
      setSubiendo(false)
      // Reset input
      const input = document.getElementById(`file-input-${categoriaActiva}`) as HTMLInputElement
      if (input) input.value = ""
    }
  }

  async function handleEliminar(id: string) {
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

  const imagenesPorCategoria = categorias.reduce((acc, cat) => {
    acc[cat.value] = imagenes.filter((img) => img.categoria === cat.value)
    return acc
  }, {} as Record<string, PropiedadImagen[]>)

  return (
    <div className="space-y-6">
      {!readonly && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex gap-2">
            {categorias.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoriaActiva(cat.value as any)}
                className={`px-4 py-2 rounded-lg transition ${
                  categoriaActiva === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {categorias.map((cat) => {
        const imagenesCategoria = imagenesPorCategoria[cat.value] || []
        return (
          <Card key={cat.value}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.label}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({imagenesCategoria.length})
                  </span>
                </CardTitle>
                </div>
              </CardHeader>
            <CardContent>
              {imagenesCategoria.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No hay fotos en esta categoría</p>
                  {!readonly && (
                    <label
                      htmlFor={`file-input-${cat.value}`}
                      className="inline-flex items-center gap-2 mt-4 cursor-pointer text-primary hover:underline"
                    >
                      <Upload className="h-4 w-4" />
                      Subir primera foto
                      <input
                        id={`file-input-${cat.value}`}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => handleSubir(e.target.files)}
                      />
                    </label>
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
                    <label className="aspect-square flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-muted transition">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <input
                        id={`file-input-${cat.value}`}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => handleSubir(e.target.files)}
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
