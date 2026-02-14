"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
import type { ContratoConRelaciones } from "@/lib/types/database"

type Propiedad = {
  id: string
  direccion: string
  ciudad: string
  valor_arriendo: number
}

type Arrendatario = {
  id: string
  nombre: string
  cedula: string
}

export default function EditarContratoPage() {
  const params = useParams()
  const router = useRouter()
  const [contrato, setContrato] = useState<ContratoConRelaciones | null>(null)
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [arrendatarios, setArrendatarios] = useState<Arrendatario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    propiedad_id: "",
    arrendatario_id: "",
    fecha_inicio: "",
    duracion_meses: 12,
    canon_mensual: 0,
    ciudad_firma: "",
    estado: "borrador" as "borrador" | "activo" | "terminado" | "vencido",
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/contratos/${params.id}`).then((res) => res.json()),
      fetch("/api/propiedades").then((res) => res.json()),
      fetch("/api/arrendatarios").then((res) => res.json()),
    ])
      .then(([cont, props, arrend]) => {
        setContrato(cont)
        setPropiedades(props)
        setArrendatarios(arrend)
        setFormData({
          propiedad_id: cont.propiedad_id || "",
          arrendatario_id: cont.arrendatario_id || "",
          fecha_inicio: cont.fecha_inicio?.split("T")[0] || new Date().toISOString().split("T")[0],
          duracion_meses: cont.duracion_meses || 12,
          canon_mensual: cont.canon_mensual || 0,
          ciudad_firma: cont.ciudad_firma || "",
          estado: cont.estado || "borrador",
        })
      })
      .finally(() => setLoading(false))
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch(`/api/contratos/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (res.ok) {
      router.push(`/contratos/${params.id}`)
    } else {
      const error = await res.json()
      alert(error.error || "Error al actualizar contrato")
      setSaving(false)
    }
  }

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  if (loading) {
    return <p className="text-muted-foreground">Cargando datos...</p>
  }

  if (!contrato) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contrato no encontrado</CardTitle>
          <CardDescription>El contrato que buscas no existe.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/contratos">Volver a contratos</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/contratos/${params.id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Editar Contrato</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Contrato</CardTitle>
            <CardDescription>Actualiza los datos del contrato</CardDescription>
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
                      canon_mensual: prop?.valor_arriendo || formData.canon_mensual,
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

            <div>
              <label className="block text-sm font-medium mb-1">
                Estado *
              </label>
              <select
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.estado}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estado: e.target.value as "borrador" | "activo" | "terminado" | "vencido",
                  })
                }
              >
                <option value="borrador">Borrador</option>
                <option value="activo">Activo</option>
                <option value="terminado">Terminado</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/contratos/${params.id}`}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
