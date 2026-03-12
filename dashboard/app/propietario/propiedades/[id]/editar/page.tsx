"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save, X } from "lucide-react"

interface Propiedad {
  id: string
  titulo: string
  direccion: string
  ciudad: string
  habitaciones: number
  banos: number
  area: number
  valor_arriendo: number
  descripcion?: string
  barrio?: string
  tipo?: string
  estado?: string
}

export default function EditarPropiedadPage() {
  const router = useRouter()
  const params = useParams()
  const propiedadId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)

  // Cargar datos de la propiedad
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: string } | null) => {
        if (data?.role === "admin") {
          router.replace("/admin/dashboard")
          return
        }
        if (data?.role === "inquilino") {
          router.replace("/inquilino/dashboard")
          return
        }

        return fetch(`/api/propiedades/${propiedadId}`)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
          })
          .then((data: Propiedad) => {
            setPropiedad(data)
            setLoading(false)
          })
          .catch((err) => {
            setError(`Error: ${err.message}`)
            setLoading(false)
          })
      })
      .catch(() => {
        setError("Error de autenticación")
        setLoading(false)
      })
  }, [router, propiedadId])

  const handleChange = (field: keyof Propiedad, value: any) => {
    if (propiedad) {
      setPropiedad({
        ...propiedad,
        [field]: value,
      })
    }
  }

  const handleSave = async () => {
    if (!propiedad) return

    setSaving(true)
    try {
      const res = await fetch(`/api/propiedades/${propiedadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(propiedad),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      alert("Propiedad actualizada correctamente")
      router.push("/propietario/propiedades")
    } catch (err: any) {
      setError(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600 font-semibold">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!propiedad) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <p className="text-yellow-600 font-semibold">Propiedad no encontrada</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div suppressHydrationWarning>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/propietario/propiedades">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Editar Propiedad</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Propiedad</CardTitle>
          <CardDescription>Actualiza los detalles de tu propiedad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <Input
                value={propiedad.titulo}
                onChange={(e) => handleChange("titulo", e.target.value)}
                placeholder="Ej: Casa moderna en el norte"
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <Input
                value={propiedad.direccion}
                onChange={(e) => handleChange("direccion", e.target.value)}
                placeholder="Ej: Calle 10 No. 45-67"
              />
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-sm font-medium mb-1">Ciudad</label>
              <Input
                value={propiedad.ciudad}
                onChange={(e) => handleChange("ciudad", e.target.value)}
                placeholder="Ej: Bogotá"
              />
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium mb-1">Habitaciones</label>
                <Input
                  type="number"
                  value={propiedad.habitaciones}
                  onChange={(e) => handleChange("habitaciones", parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Baños</label>
                <Input
                  type="number"
                  value={propiedad.banos}
                  onChange={(e) => handleChange("banos", parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Área (m²)</label>
                <Input
                  type="number"
                  value={propiedad.area}
                  onChange={(e) => handleChange("area", parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor Arriendo ($)</label>
                <Input
                  type="number"
                  value={propiedad.valor_arriendo}
                  onChange={(e) => handleChange("valor_arriendo", parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={propiedad.descripcion || ""}
                onChange={(e) => handleChange("descripcion", e.target.value)}
                placeholder="Describe tu propiedad..."
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Link href="/propietario/propiedades" className="flex-1">
                <Button variant="outline" className="w-full">
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
