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
  matricula_inmobiliaria?: string
  cuenta_bancaria_entidad?: string
  cuenta_bancaria_tipo?: string
  cuenta_bancaria_numero?: string
  cuenta_bancaria_titular?: string
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
    const cargarDatos = async () => {
      try {
        // Primero verificar autenticación
        const authRes = await fetch("/api/auth/me")
        if (!authRes.ok) {
          console.error("Error en auth/me:", authRes.status)
          setError("Error de autenticación")
          setLoading(false)
          return
        }

        const authData = await authRes.json()
        console.log("Auth data:", authData)

        if (authData.role === "inquilino") {
          router.replace("/inquilino/dashboard")
          return
        }

        // Admin y propietario pueden editar propiedades
        if (authData.role !== "admin" && authData.role !== "propietario") {
          setError("No tienes permiso para editar propiedades")
          setLoading(false)
          return
        }

        // Cargar la propiedad
        const propRes = await fetch(`/api/propiedades/${propiedadId}`)
        if (!propRes.ok) {
          const errorData = await propRes.json().catch(() => ({ error: "Error desconocido" }))
          console.error("Error cargando propiedad:", propRes.status, errorData)
          setError(`Error al cargar propiedad: ${errorData.error || propRes.statusText}`)
          setLoading(false)
          return
        }

        const propData = await propRes.json()
        console.log("Propiedad cargada:", propData)
        setPropiedad(propData)
        setLoading(false)
      } catch (err) {
        console.error("Error general:", err)
        setError(`Error: ${err instanceof Error ? err.message : "Error desconocido"}`)
        setLoading(false)
      }
    }

    cargarDatos()
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

      router.push("/propiedades")
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
        <Link href="/propiedades">
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

            {/* Ciudad y Barrio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ciudad</label>
                <Input
                  value={propiedad.ciudad}
                  onChange={(e) => handleChange("ciudad", e.target.value)}
                  placeholder="Ej: Bogotá"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Barrio</label>
                <Input
                  value={propiedad.barrio || ""}
                  onChange={(e) => handleChange("barrio", e.target.value)}
                  placeholder="Ej: Chapinero"
                />
              </div>
            </div>

            {/* Tipo y Estado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={propiedad.tipo || "apartamento"}
                  onChange={(e) => handleChange("tipo", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="apartamento">Apartamento</option>
                  <option value="casa">Casa</option>
                  <option value="habitacion">Habitación</option>
                  <option value="local">Local</option>
                  <option value="oficina">Oficina</option>
                  <option value="lote">Lote</option>
                  <option value="finca">Finca</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={propiedad.estado || "disponible"}
                  onChange={(e) => handleChange("estado", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="disponible">Disponible</option>
                  <option value="arrendado">Arrendado</option>
                  <option value="mantenimiento">En Mantenimiento</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
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

            {/* Información Legal y Bancaria */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Información Legal y Bancaria</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Matrícula Inmobiliaria</label>
                <Input
                  value={propiedad.matricula_inmobiliaria || ""}
                  onChange={(e) => handleChange("matricula_inmobiliaria", e.target.value)}
                  placeholder="Ej: 050-123456"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Entidad Bancaria</label>
                  <Input
                    value={propiedad.cuenta_bancaria_entidad || ""}
                    onChange={(e) => handleChange("cuenta_bancaria_entidad", e.target.value)}
                    placeholder="Ej: Bancolombia"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Cuenta</label>
                  <select
                    value={propiedad.cuenta_bancaria_tipo || ""}
                    onChange={(e) => handleChange("cuenta_bancaria_tipo", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="ahorros">Ahorros</option>
                    <option value="corriente">Corriente</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Número de Cuenta</label>
                <Input
                  value={propiedad.cuenta_bancaria_numero || ""}
                  onChange={(e) => handleChange("cuenta_bancaria_numero", e.target.value)}
                  placeholder="Ej: 123-456-789"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Titular de la Cuenta</label>
                <Input
                  value={propiedad.cuenta_bancaria_titular || ""}
                  onChange={(e) => handleChange("cuenta_bancaria_titular", e.target.value)}
                  placeholder="Nombre del titular de la cuenta"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Link href="/propiedades" className="flex-1">
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
