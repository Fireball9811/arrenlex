"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowLeft, Save } from "lucide-react"

type Propiedad = {
  id: string
  direccion: string
  ciudad: string
  valor_arriendo: number
  matricula_inmobiliaria?: string | null
}

type Arrendatario = {
  id: string
  nombre: string
  cedula: string
}

export default function NuevoContratoPage() {
  const router = useRouter()
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [arrendatarios, setArrendatarios] = useState<Arrendatario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    propiedad_id: "",
    arrendatario_id: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    duracion_meses: 12,
    canon_mensual: 0,
    ciudad_firma: "",
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/propiedades").then((res) => res.json()),
      fetch("/api/arrendatarios").then((res) => res.json()),
    ])
      .then(([props, arrend]) => {
        setPropiedades(props)
        setArrendatarios(arrend)
        if (props.length > 0) {
          setFormData((prev) => ({
            ...prev,
            propiedad_id: props[0].id,
            canon_mensual: props[0].valor_arriendo || 0,
            ciudad_firma: props[0].ciudad || "",
          }))
        }
        if (arrend.length > 0) {
          setFormData((prev) => ({ ...prev, arrendatario_id: arrend[0].id }))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/contratos/${data.id}`)
    } else {
      const error = await res.json()
      alert(error.error || "Error al crear contrato")
      setSaving(false)
    }
  }

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  if (loading) {
    return <p className="text-muted-foreground">Cargando datos...</p>
  }

  if (propiedades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin propiedades</CardTitle>
          <CardDescription>
            Necesitas tener al menos una propiedad registrada para crear un contrato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/propiedades/nuevo">Nueva propiedad</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (arrendatarios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin arrendatarios</CardTitle>
          <CardDescription>
            Necesitas tener al menos un arrendatario registrado para crear un contrato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/nuevo">Nuevo arrendatario</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const selectedPropiedad = propiedades.find((p) => p.id === formData.propiedad_id)

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contratos">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Nuevo Contrato</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Contrato</CardTitle>
            <CardDescription>Selecciona la propiedad y el arrendatario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Propiedad *</label>
                <select
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.propiedad_id}
                  onChange={(e) => {
                    const prop = propiedades.find((p) => p.id === e.target.value)
                    setFormData({
                      ...formData,
                      propiedad_id: e.target.value,
                      canon_mensual: prop?.valor_arriendo || 0,
                      ciudad_firma: prop?.ciudad || "",
                    })
                  }}
                >
                  {propiedades.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.direccion} · {p.ciudad}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Arrendatario *</label>
                <select
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.arrendatario_id}
                  onChange={(e) =>
                    setFormData({ ...formData, arrendatario_id: e.target.value })
                  }
                >
                  {arrendatarios.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} · {a.cedula}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de inicio *
                </label>
                <input
                  type="date"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.fecha_inicio}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_inicio: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Duración (meses) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.duracion_meses}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duracion_meses: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Canon mensual *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.canon_mensual}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      canon_mensual: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatPeso(formData.canon_mensual)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Ciudad de firma *
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.ciudad_firma}
                  onChange={(e) =>
                    setFormData({ ...formData, ciudad_firma: e.target.value })
                  }
                  placeholder="Ej: Bogotá D.C."
                />
              </div>
            </div>

            {selectedPropiedad?.matricula_inmobiliaria && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Matrícula inmobiliaria:</strong>{" "}
                  {selectedPropiedad.matricula_inmobiliaria}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Crear Contrato"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/contratos">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
