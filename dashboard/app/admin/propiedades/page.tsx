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
import { Camera, Link2, Copy, Check } from "lucide-react"
import type { Propiedad } from "@/lib/types/database"
import { useLang } from "@/lib/i18n/context"
import { uploadImageToSupabase } from "@/lib/supabase-storage"
import { createClient } from "@/lib/supabase/client"

type PropiedadConPropietario = Propiedad & {
  propietario?: { id: string; nombre: string | null; email: string } | null
}

export default function AdminPropiedadesPage() {
  const { t } = useLang()
  const [propiedades, setPropiedades] = useState<PropiedadConPropietario[]>([])
  const [loading, setLoading] = useState(true)
  const [imagenPorPropiedadId, setImagenPorPropiedadId] = useState<Record<string, string | null>>({})
  const [subiendoPorId, setSubiendoPorId] = useState<Record<string, boolean>>({})
  const [dragOverPropiedadId, setDragOverPropiedadId] = useState<string | null>(null)
  const [generandoTokenId, setGenerandoTokenId] = useState<string | null>(null)
  const [enlaceGenerado, setEnlaceGenerado] = useState<Record<string, string>>({})
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/propiedades")
      .then((res) => res.json())
      .then(setPropiedades)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (propiedades.length === 0) return
    Promise.all(
      propiedades.map((p) =>
        fetch(`/api/propiedades/imagenes?propiedad_id=${p.id}`)
          .then((res) => res.json())
          .then((data: { url_publica?: string }[]) => ({ id: p.id, url: data?.[0]?.url_publica ?? null }))
      )
    ).then((results) => {
      const next: Record<string, string | null> = {}
      results.forEach(({ id, url }) => { next[id] = url })
      setImagenPorPropiedadId((prev) => ({ ...prev, ...next }))
    })
  }, [propiedades])

  async function handleSubirFoto(propiedadId: string, file: File) {
    setSubiendoPorId((prev) => ({ ...prev, [propiedadId]: true }))
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert("Debes iniciar sesión para subir imágenes."); return }
      const { url } = await uploadImageToSupabase(file, propiedadId, "fachada", user.id)
      setImagenPorPropiedadId((prev) => ({ ...prev, [propiedadId]: url }))
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al subir la foto")
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

  function handleDragOver(e: React.DragEvent, propiedadId: string) {
    e.preventDefault(); e.stopPropagation()
    setDragOverPropiedadId(propiedadId)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    if (e.currentTarget === e.target) setDragOverPropiedadId(null)
  }

  function handleDrop(e: React.DragEvent, propiedadId: string) {
    e.preventDefault(); e.stopPropagation()
    setDragOverPropiedadId(null)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) handleSubirFoto(propiedadId, file)
  }

  async function handleGenerarEnlace(propiedadId: string) {
    setGenerandoTokenId(propiedadId)
    try {
      const res = await fetch("/api/intake/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedad_id: propiedadId }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? "Error al generar el enlace"); return }
      setEnlaceGenerado((prev) => ({ ...prev, [propiedadId]: data.url }))
    } catch {
      alert("Error al generar el enlace de aplicación")
    } finally {
      setGenerandoTokenId(null)
    }
  }

  async function handleCopiarEnlace(propiedadId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiadoId(propiedadId)
      setTimeout(() => setCopiadoId((prev) => (prev === propiedadId ? null : prev)), 2000)
    } catch {
      alert("No se pudo copiar. Copia manualmente: " + url)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.propiedades.confirmarEliminar)) return
    const res = await fetch(`/api/propiedades/${id}`, { method: "DELETE" })
    if (res.ok) {
      setPropiedades((prev) => prev.filter((p) => p.id !== id))
      setImagenPorPropiedadId((prev) => { const next = { ...prev }; delete next[id]; return next })
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
        <h1 className="text-3xl font-bold">{t.propiedades.titulo}</h1>
        <Button asChild>
          <Link href="/admin/propiedades/nuevo">{t.propiedades.nuevaPropiedad}</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t.propiedades.cargando}</p>
      ) : propiedades.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.propiedades.sinPropiedades}</CardTitle>
            <CardDescription>{t.propiedades.sinPropiedadesDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/propiedades/nuevo">{t.propiedades.nuevaPropiedad}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {propiedades.map((p) => (
            <Card key={p.id} className="flex flex-row overflow-hidden relative">
              <span className={`absolute top-3 right-3 z-10 rounded px-3 py-1 text-xs font-semibold shadow-sm ${estadoColors[p.estado] ?? "bg-gray-100 text-gray-800"}`}>
                {p.estado}
              </span>
              <div
                className={`relative w-56 shrink-0 bg-muted sm:w-72 transition-all cursor-pointer ${dragOverPropiedadId === p.id ? "border-primary border-2 bg-primary/5" : ""}`}
                onDragOver={(e) => handleDragOver(e, p.id)}
                onDragLeave={(e) => handleDragLeave(e)}
                onDrop={(e) => handleDrop(e, p.id)}
                onClick={() => document.getElementById(`file-input-${p.id}`)?.click()}
              >
                <input id={`file-input-${p.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileInputChange(p.id, e)} disabled={subiendoPorId[p.id]} />
                {subiendoPorId[p.id] ? (
                  <div className="flex h-full min-h-[200px] items-center justify-center">
                    <span className="text-sm text-muted-foreground">{t.propiedades.subiendo}</span>
                  </div>
                ) : imagenPorPropiedadId[p.id] ? (
                  <img src={imagenPorPropiedadId[p.id]!} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="pointer-events-none flex h-full min-h-[200px] flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground hover:text-foreground transition hover:bg-muted/80">
                    <Camera className="h-12 w-12" />
                    <span className="text-sm font-medium">{t.propiedades.subirFoto}</span>
                    <span className="text-xs text-muted-foreground">{t.propiedades.arrastraAqui}</span>
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col p-4">
                <CardTitle className="text-xl pr-20">{p.direccion}</CardTitle>
                <CardDescription className="mt-1">{p.barrio}, {p.ciudad} · {p.tipo}</CardDescription>
                {p.propietario && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.propiedades.propietario} {p.propietario.nombre ?? p.propietario.email}
                  </p>
                )}
                <CardContent className="flex-1 space-y-2 p-0 pt-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>🛏 {p.habitaciones} hab</span>
                    <span>🚿 {p.banos} baños</span>
                    <span>📐 {p.area} m²</span>
                    <span>🛗 {p.ascensor || 0} asc</span>
                    <span>📦 {p.depositos || 0} dep</span>
                    <span>🚗 {p.parqueaderos || 0} parq</span>
                  </div>
                  <p className="text-lg font-semibold">{formatPeso(p.valor_arriendo)}</p>
                  {p.descripcion && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{p.descripcion}</p>
                  )}
                </CardContent>
                <div className="flex flex-wrap gap-2 pt-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/propiedades/${p.id}/editar`}>{t.comun.editar}</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(p.id)}>
                    {t.comun.eliminar}
                  </Button>
                  {p.estado === "disponible" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                      onClick={() => handleGenerarEnlace(p.id)}
                      disabled={generandoTokenId === p.id}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      {generandoTokenId === p.id ? "Generando…" : "Enlace aplicación"}
                    </Button>
                  )}
                </div>
                {enlaceGenerado[p.id] && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-cyan-50 border border-cyan-100 px-3 py-2">
                    <p className="text-xs text-cyan-800 truncate flex-1 font-mono">{enlaceGenerado[p.id]}</p>
                    <button
                      onClick={() => handleCopiarEnlace(p.id, enlaceGenerado[p.id])}
                      className="shrink-0 text-cyan-600 hover:text-cyan-800"
                      title="Copiar enlace"
                    >
                      {copiadoId === p.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
