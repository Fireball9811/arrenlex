"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Camera } from "lucide-react"
import type { Propiedad } from "@/lib/types/database"

type PropiedadConPropietario = Propiedad & {
  propietario?: { id: string; nombre: string | null; email: string } | null
}

export default function PropiedadesPage() {
  const [propiedades, setPropiedades] = useState<PropiedadConPropietario[]>([])
  const [loading, setLoading] = useState(true)
  const [imagenPorPropiedadId, setImagenPorPropiedadId] = useState<Record<string, string | null>>({})
  const [subiendoPorId, setSubiendoPorId] = useState<Record<string, boolean>>({})
  const [dragOverPropiedadId, setDragOverPropiedadId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/propiedades")
      .then((res) => res.json())
      .then(setPropiedades)
      .finally(() => setLoading(false))
  }, [])

  // Cargar primera imagen por propiedad cuando hay propiedades
  useEffect(() => {
    if (propiedades.length === 0) return

    Promise.all(
      propiedades.map((p) =>
        fetch(`/api/propiedades/imagenes?propiedad_id=${p.id}`)
          .then((res) => res.json())
          .then((data: { url_publica?: string }[]) => ({
            id: p.id,
            url: data?.[0]?.url_publica ?? null,
          }))
      )
    ).then((results) => {
      const next: Record<string, string | null> = {}
      results.forEach(({ id, url }) => {
        next[id] = url
      })
      setImagenPorPropiedadId((prev) => ({ ...prev, ...next }))
    })
  }, [propiedades])

  async function handleSubirFoto(propiedadId: string, file: File) {
    setSubiendoPorId((prev) => ({ ...prev, [propiedadId]: true }))

    const formData = new FormData()
    formData.append("propiedad_id", propiedadId)
    formData.append("categoria", "fachada")
    formData.append("archivo", file)

    try {
      const res = await fetch("/api/propiedades/imagenes", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (data.error) {
        alert(data.error || "Error al subir la foto")
        return
      }
      if (data.url_publica) {
        setImagenPorPropiedadId((prev) => ({ ...prev, [propiedadId]: data.url_publica }))
      }
    } finally {
      setSubiendoPorId((prev) => ({ ...prev, [propiedadId]: false }))
    }
  }

  function handleFileInputChange(propiedadId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleSubirFoto(propiedadId, file)
    e.target.value = ""
  }

  // Drag & Drop handlers
  function handleDragOver(e: React.DragEvent, propiedadId: string) {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPropiedadId(propiedadId)
  }

  function handleDragLeave(e: React.DragEvent, propiedadId: string) {
    e.preventDefault()
    e.stopPropagation()
    // Solo limpiar si estamos saliendo del elemento, no de un hijo
    if (e.currentTarget === e.target) {
      setDragOverPropiedadId(null)
    }
  }

  function handleDrop(e: React.DragEvent, propiedadId: string) {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPropiedadId(null)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      handleSubirFoto(propiedadId, file)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta propiedad?")) return
    const res = await fetch(`/api/propiedades/${id}`, { method: "DELETE" })
    if (res.ok) {
      setPropiedades((prev) => prev.filter((p) => p.id !== id))
      setImagenPorPropiedadId((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  const estadoColors: Record<string, string> = {
    disponible: "bg-green-100 text-green-800",
    arrendado: "bg-blue-100 text-blue-800",
    mantenimiento: "bg-amber-100 text-amber-800",
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Propiedades</h1>
        <Button asChild>
          <Link href="/propiedades/nuevo">Nueva propiedad</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando propiedades...</p>
      ) : propiedades.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin propiedades</CardTitle>
            <CardDescription>
              Aún no hay propiedades registradas. Crea la primera.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/propiedades/nuevo">Nueva propiedad</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {propiedades.map((p) => (
            <Card key={p.id} className="flex flex-row overflow-hidden">
              {/* Columna izquierda: texto */}
              <div className="flex min-w-0 flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{p.direccion}</CardTitle>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${estadoColors[p.estado] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {p.estado}
                  </span>
                </div>
                <CardDescription className="mt-1">
                  {p.barrio}, {p.ciudad} · {p.tipo}
                </CardDescription>
                {p.propietario && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Propietario: {p.propietario.nombre ?? p.propietario.email}
                  </p>
                )}
                <CardContent className="flex-1 space-y-2 p-0 pt-2">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>🛏 {p.habitaciones} hab</span>
                    <span>🚿 {p.banos} baños</span>
                    <span>📐 {p.area} m²</span>
                  </div>
                  <p className="text-lg font-semibold">{formatPeso(p.valor_arriendo)}</p>
                  {p.descripcion && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{p.descripcion}</p>
                  )}
                </CardContent>
                <div className="flex gap-2 pt-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/propiedades/${p.id}/editar`}>Editar</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDelete(p.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
              {/* Columna derecha: foto ocupa todo el alto */}
              <div
                className={`relative w-44 shrink-0 bg-muted sm:w-52 transition-all cursor-pointer ${
                  dragOverPropiedadId === p.id ? "border-primary border-2 bg-primary/5" : ""
                }`}
                onDragOver={(e) => handleDragOver(e, p.id)}
                onDragLeave={(e) => handleDragLeave(e, p.id)}
                onDrop={(e) => handleDrop(e, p.id)}
                onClick={() => document.getElementById(`file-input-${p.id}`)?.click()}
              >
                <input
                  id={`file-input-${p.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileInputChange(p.id, e)}
                  disabled={subiendoPorId[p.id]}
                />
                {subiendoPorId[p.id] ? (
                  <div className="flex h-full min-h-[200px] items-center justify-center">
                    <span className="text-sm text-muted-foreground">Subiendo…</span>
                  </div>
                ) : imagenPorPropiedadId[p.id] ? (
                  <img
                    src={imagenPorPropiedadId[p.id]!}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground hover:text-foreground transition hover:bg-muted/80">
                    <Camera className="h-10 w-10" />
                    <span className="text-xs font-medium">Subir foto</span>
                    <span className="text-xs text-muted-foreground">o arrastra aquí</span>
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
