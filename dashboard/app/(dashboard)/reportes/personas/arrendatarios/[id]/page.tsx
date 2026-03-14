"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

type Arrendatario = {
  id: string
  nombre: string
  cedula: string
  telefono: string
  email: string | null
  celular: string | null
  adultos_habitantes: number | null
  ninos_habitantes: number | null
  mascotas_cantidad: number | null
  vehiculos_cantidad: number | null
  vehiculos_placas: string | null
  coarrendatario_nombre: string | null
  coarrendatario_cedula: string | null
  coarrendatario_telefono: string | null
  coarrendatario_email: string | null
  salario_principal: number | null
  salario_secundario: number | null
  empresa_principal: string | null
  empresa_secundaria: string | null
  tiempo_servicio_principal_meses: number | null
  tiempo_servicio_secundario_meses: number | null
  ref_familiar_1_nombre: string | null
  ref_familiar_1_parentesco: string | null
  ref_familiar_1_cedula: string | null
  ref_familiar_1_telefono: string | null
  ref_familiar_2_nombre: string | null
  ref_familiar_2_parentesco: string | null
  ref_familiar_2_cedula: string | null
  ref_familiar_2_telefono: string | null
  ref_personal_1_nombre: string | null
  ref_personal_1_cedula: string | null
  ref_personal_1_telefono: string | null
  ref_personal_2_nombre: string | null
  ref_personal_2_cedula: string | null
  ref_personal_2_telefono: string | null
}

export default function EditarArrendatarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [arrendatarioId, setArrendatarioId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [formData, setFormData] = useState({
    // Datos personales del titular
    nombre: "",
    cedula: "",
    telefono: "",
    email: "",
    celular: "",

    // Grupo familiar
    adultos_habitantes: "",
    ninos_habitantes: "",
    mascotas_cantidad: "",
    vehiculos_cantidad: "",
    vehiculos_placas: "",

    // Coarrendatario
    coarrendatario_nombre: "",
    coarrendatario_cedula: "",
    coarrendatario_telefono: "",
    coarrendatario_email: "",

    // Información laboral y financiera
    salario_principal: "",
    salario_secundario: "",
    empresa_principal: "",
    empresa_secundaria: "",
    tiempo_servicio_principal_meses: "",
    tiempo_servicio_secundario_meses: "",

    // Referencias familiares
    ref_familiar_1_nombre: "",
    ref_familiar_1_parentesco: "",
    ref_familiar_1_cedula: "",
    ref_familiar_1_telefono: "",
    ref_familiar_2_nombre: "",
    ref_familiar_2_parentesco: "",
    ref_familiar_2_cedula: "",
    ref_familiar_2_telefono: "",

    // Referencias personales
    ref_personal_1_nombre: "",
    ref_personal_1_cedula: "",
    ref_personal_1_telefono: "",
    ref_personal_2_nombre: "",
    ref_personal_2_cedula: "",
    ref_personal_2_telefono: "",
  })

  useEffect(() => {
    params.then((p) => {
      setArrendatarioId(p.id)
      fetchArrendatario(p.id)
    })
  }, [params])

  async function fetchArrendatario(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/arrendatarios/${id}`)
      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Error al cargar arrendatario" })
        return
      }

      const data: Arrendatario = await res.json()

      setFormData({
        nombre: data.nombre || "",
        cedula: data.cedula || "",
        telefono: data.telefono || "",
        email: data.email || "",
        celular: data.celular || "",
        adultos_habitantes: data.adultos_habitantes?.toString() || "",
        ninos_habitantes: data.ninos_habitantes?.toString() || "",
        mascotas_cantidad: data.mascotas_cantidad?.toString() || "",
        vehiculos_cantidad: data.vehiculos_cantidad?.toString() || "",
        vehiculos_placas: data.vehiculos_placas || "",
        coarrendatario_nombre: data.coarrendatario_nombre || "",
        coarrendatario_cedula: data.coarrendatario_cedula || "",
        coarrendatario_telefono: data.coarrendatario_telefono || "",
        coarrendatario_email: data.coarrendatario_email || "",
        salario_principal: data.salario_principal?.toString() || "",
        salario_secundario: data.salario_secundario?.toString() || "",
        empresa_principal: data.empresa_principal || "",
        empresa_secundaria: data.empresa_secundaria || "",
        tiempo_servicio_principal_meses: data.tiempo_servicio_principal_meses?.toString() || "",
        tiempo_servicio_secundario_meses: data.tiempo_servicio_secundario_meses?.toString() || "",
        ref_familiar_1_nombre: data.ref_familiar_1_nombre || "",
        ref_familiar_1_parentesco: data.ref_familiar_1_parentesco || "",
        ref_familiar_1_cedula: data.ref_familiar_1_cedula || "",
        ref_familiar_1_telefono: data.ref_familiar_1_telefono || "",
        ref_familiar_2_nombre: data.ref_familiar_2_nombre || "",
        ref_familiar_2_parentesco: data.ref_familiar_2_parentesco || "",
        ref_familiar_2_cedula: data.ref_familiar_2_cedula || "",
        ref_familiar_2_telefono: data.ref_familiar_2_telefono || "",
        ref_personal_1_nombre: data.ref_personal_1_nombre || "",
        ref_personal_1_cedula: data.ref_personal_1_cedula || "",
        ref_personal_1_telefono: data.ref_personal_1_telefono || "",
        ref_personal_2_nombre: data.ref_personal_2_nombre || "",
        ref_personal_2_cedula: data.ref_personal_2_cedula || "",
        ref_personal_2_telefono: data.ref_personal_2_telefono || "",
      })
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!arrendatarioId) return

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/admin/arrendatarios/${arrendatarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: "success", text: "Arrendatario actualizado exitosamente" })
        setTimeout(() => router.push("/reportes/personas"), 1500)
      } else {
        setMessage({ type: "error", text: data.error || "Error al actualizar arrendatario" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reportes/personas">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Arrendatario</h1>
          <p className="text-muted-foreground">
            {formData.nombre || "Sin nombre"} • {formData.cedula}
          </p>
        </div>
      </div>

      {/* Mensajes */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Personales del Titular */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Personales del Titular</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo *</label>
              <input
                type="text"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula *</label>
              <input
                type="text"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono *</label>
              <input
                type="tel"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Celular</label>
              <input
                type="tel"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.celular}
                onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Correo electrónico</label>
              <input
                type="email"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Grupo Familiar */}
        <Card>
          <CardHeader>
            <CardTitle>Grupo Familiar</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Adultos</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.adultos_habitantes}
                onChange={(e) => setFormData({ ...formData, adultos_habitantes: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Niños</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ninos_habitantes}
                onChange={(e) => setFormData({ ...formData, ninos_habitantes: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mascotas</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.mascotas_cantidad}
                onChange={(e) => setFormData({ ...formData, mascotas_cantidad: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vehículos</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.vehiculos_cantidad}
                onChange={(e) => setFormData({ ...formData, vehiculos_cantidad: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Placas</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.vehiculos_placas}
                onChange={(e) => setFormData({ ...formData, vehiculos_placas: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Coarrendatario */}
        <Card>
          <CardHeader>
            <CardTitle>Coarrendatario</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.coarrendatario_nombre}
                onChange={(e) => setFormData({ ...formData, coarrendatario_nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.coarrendatario_cedula}
                onChange={(e) => setFormData({ ...formData, coarrendatario_cedula: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.coarrendatario_telefono}
                onChange={(e) => setFormData({ ...formData, coarrendatario_telefono: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Correo electrónico</label>
              <input
                type="email"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.coarrendatario_email}
                onChange={(e) => setFormData({ ...formData, coarrendatario_email: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Información Laboral y Financiera */}
        <Card>
          <CardHeader>
            <CardTitle>Información Laboral y Financiera</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Salario Principal</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.salario_principal}
                onChange={(e) => setFormData({ ...formData, salario_principal: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Salario Secundario</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.salario_secundario}
                onChange={(e) => setFormData({ ...formData, salario_secundario: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Empresa Principal</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.empresa_principal}
                onChange={(e) => setFormData({ ...formData, empresa_principal: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Empresa Secundaria</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.empresa_secundaria}
                onChange={(e) => setFormData({ ...formData, empresa_secundaria: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tiempo Servicio Principal (meses)</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.tiempo_servicio_principal_meses}
                onChange={(e) => setFormData({ ...formData, tiempo_servicio_principal_meses: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tiempo Servicio Secundario (meses)</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.tiempo_servicio_secundario_meses}
                onChange={(e) => setFormData({ ...formData, tiempo_servicio_secundario_meses: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Referencias Familiares */}
        <Card>
          <CardHeader>
            <CardTitle>Referencias Familiares</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Referencia 1 - Nombre</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_familiar_1_nombre}
                onChange={(e) => setFormData({ ...formData, ref_familiar_1_nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parentesco</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_familiar_1_parentesco}
                onChange={(e) => setFormData({ ...formData, ref_familiar_1_parentesco: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_familiar_1_cedula}
                onChange={(e) => setFormData({ ...formData, ref_familiar_1_cedula: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_familiar_1_telefono}
                onChange={(e) => setFormData({ ...formData, ref_familiar_1_telefono: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <label className="block text-sm font-medium mb-1">Referencia 2 - Nombre</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_familiar_2_nombre}
                onChange={(e) => setFormData({ ...formData, ref_familiar_2_nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parentesco</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_familiar_2_parentesco}
                onChange={(e) => setFormData({ ...formData, ref_familiar_2_parentesco: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_familiar_2_cedula}
                onChange={(e) => setFormData({ ...formData, ref_familiar_2_cedula: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_familiar_2_telefono}
                onChange={(e) => setFormData({ ...formData, ref_familiar_2_telefono: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Referencias Personales */}
        <Card>
          <CardHeader>
            <CardTitle>Referencias Personales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Referencia 1 - Nombre</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_personal_1_nombre}
                onChange={(e) => setFormData({ ...formData, ref_personal_1_nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_personal_1_cedula}
                onChange={(e) => setFormData({ ...formData, ref_personal_1_cedula: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_personal_1_telefono}
                onChange={(e) => setFormData({ ...formData, ref_personal_1_telefono: e.target.value })}
              />
            </div>

            <div className="md:col-span-3 border-t pt-4">
              <label className="block text-sm font-medium mb-1">Referencia 2 - Nombre</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_personal_2_nombre}
                onChange={(e) => setFormData({ ...formData, ref_personal_2_nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_personal_2_cedula}
                onChange={(e) => setFormData({ ...formData, ref_personal_2_cedula: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ref_personal_2_telefono}
                onChange={(e) => setFormData({ ...formData, ref_personal_2_telefono: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
          <Link href="/reportes/personas">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
