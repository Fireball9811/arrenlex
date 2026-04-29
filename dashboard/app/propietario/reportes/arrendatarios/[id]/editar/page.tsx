"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

type FormData = {
  nombre: string
  cedula: string
  telefono: string
  email: string
  celular: string
  adultos_habitantes: string
  ninos_habitantes: string
  mascotas_cantidad: string
  vehiculos_cantidad: string
  vehiculos_placas: string
  coarrendatario_nombre: string
  coarrendatario_cedula: string
  coarrendatario_telefono: string
  coarrendatario_email: string
  salario_principal: string
  salario_secundario: string
  empresa_principal: string
  empresa_secundaria: string
  tiempo_servicio_principal_meses: string
  tiempo_servicio_secundario_meses: string
  ref_familiar_1_nombre: string
  ref_familiar_1_parentesco: string
  ref_familiar_1_cedula: string
  ref_familiar_1_telefono: string
  ref_familiar_2_nombre: string
  ref_familiar_2_parentesco: string
  ref_familiar_2_cedula: string
  ref_familiar_2_telefono: string
  ref_personal_1_nombre: string
  ref_personal_1_cedula: string
  ref_personal_1_telefono: string
  ref_personal_2_nombre: string
  ref_personal_2_cedula: string
  ref_personal_2_telefono: string
}

const emptyForm: FormData = {
  nombre: "", cedula: "", telefono: "", email: "", celular: "",
  adultos_habitantes: "", ninos_habitantes: "", mascotas_cantidad: "",
  vehiculos_cantidad: "", vehiculos_placas: "",
  coarrendatario_nombre: "", coarrendatario_cedula: "",
  coarrendatario_telefono: "", coarrendatario_email: "",
  salario_principal: "", salario_secundario: "",
  empresa_principal: "", empresa_secundaria: "",
  tiempo_servicio_principal_meses: "", tiempo_servicio_secundario_meses: "",
  ref_familiar_1_nombre: "", ref_familiar_1_parentesco: "",
  ref_familiar_1_cedula: "", ref_familiar_1_telefono: "",
  ref_familiar_2_nombre: "", ref_familiar_2_parentesco: "",
  ref_familiar_2_cedula: "", ref_familiar_2_telefono: "",
  ref_personal_1_nombre: "", ref_personal_1_cedula: "", ref_personal_1_telefono: "",
  ref_personal_2_nombre: "", ref_personal_2_cedula: "", ref_personal_2_telefono: "",
}

export default function EditarArrendatarioPropietarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [arrendatarioId, setArrendatarioId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)

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
      const data = await res.json()
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
    } catch {
      setMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setLoading(false)
    }
  }

  function set(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
        setTimeout(() => router.push("/propietario/reportes/arrendatarios"), 1500)
      } else {
        setMessage({ type: "error", text: data.error || "Error al actualizar arrendatario" })
      }
    } catch {
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

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/propietario/reportes/arrendatarios">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Arrendatario</h1>
          <p className="text-muted-foreground">
            {formData.nombre || "Sin nombre"} &nbsp;•&nbsp; {formData.cedula}
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Datos Personales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo *</label>
              <input required className={inputCls} value={formData.nombre} onChange={(e) => set("nombre", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula *</label>
              <input required className={inputCls} value={formData.cedula} onChange={(e) => set("cedula", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono *</label>
              <input required type="tel" className={inputCls} value={formData.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Celular</label>
              <input type="tel" className={inputCls} value={formData.celular} onChange={(e) => set("celular", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Correo electrónico</label>
              <input type="email" className={inputCls} value={formData.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Grupo Familiar</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(["adultos_habitantes", "ninos_habitantes", "mascotas_cantidad", "vehiculos_cantidad"] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1 capitalize">
                  {field === "adultos_habitantes" ? "Adultos" : field === "ninos_habitantes" ? "Niños" : field === "mascotas_cantidad" ? "Mascotas" : "Vehículos"}
                </label>
                <input type="number" min="0" className={inputCls} value={formData[field]} onChange={(e) => set(field, e.target.value)} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1">Placas</label>
              <input className={inputCls} value={formData.vehiculos_placas} onChange={(e) => set("vehiculos_placas", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Coarrendatario</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input className={inputCls} value={formData.coarrendatario_nombre} onChange={(e) => set("coarrendatario_nombre", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input className={inputCls} value={formData.coarrendatario_cedula} onChange={(e) => set("coarrendatario_cedula", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input type="tel" className={inputCls} value={formData.coarrendatario_telefono} onChange={(e) => set("coarrendatario_telefono", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Correo electrónico</label>
              <input type="email" className={inputCls} value={formData.coarrendatario_email} onChange={(e) => set("coarrendatario_email", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Información Laboral y Financiera</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Empresa Principal</label>
              <input className={inputCls} value={formData.empresa_principal} onChange={(e) => set("empresa_principal", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Salario Principal</label>
              <input type="number" min="0" className={inputCls} value={formData.salario_principal} onChange={(e) => set("salario_principal", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Empresa Secundaria</label>
              <input className={inputCls} value={formData.empresa_secundaria} onChange={(e) => set("empresa_secundaria", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Salario Secundario</label>
              <input type="number" min="0" className={inputCls} value={formData.salario_secundario} onChange={(e) => set("salario_secundario", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tiempo servicio principal (meses)</label>
              <input type="number" min="0" className={inputCls} value={formData.tiempo_servicio_principal_meses} onChange={(e) => set("tiempo_servicio_principal_meses", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tiempo servicio secundario (meses)</label>
              <input type="number" min="0" className={inputCls} value={formData.tiempo_servicio_secundario_meses} onChange={(e) => set("tiempo_servicio_secundario_meses", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Referencias Familiares</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 font-medium text-sm">Referencia 1</div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input className={inputCls} value={formData.ref_familiar_1_nombre} onChange={(e) => set("ref_familiar_1_nombre", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parentesco</label>
              <input className={inputCls} value={formData.ref_familiar_1_parentesco} onChange={(e) => set("ref_familiar_1_parentesco", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input className={inputCls} value={formData.ref_familiar_1_cedula} onChange={(e) => set("ref_familiar_1_cedula", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input type="tel" className={inputCls} value={formData.ref_familiar_1_telefono} onChange={(e) => set("ref_familiar_1_telefono", e.target.value)} />
            </div>
            <div className="md:col-span-2 border-t pt-4 font-medium text-sm">Referencia 2</div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input className={inputCls} value={formData.ref_familiar_2_nombre} onChange={(e) => set("ref_familiar_2_nombre", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parentesco</label>
              <input className={inputCls} value={formData.ref_familiar_2_parentesco} onChange={(e) => set("ref_familiar_2_parentesco", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input className={inputCls} value={formData.ref_familiar_2_cedula} onChange={(e) => set("ref_familiar_2_cedula", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input type="tel" className={inputCls} value={formData.ref_familiar_2_telefono} onChange={(e) => set("ref_familiar_2_telefono", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Referencias Personales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3 font-medium text-sm">Referencia 1</div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input className={inputCls} value={formData.ref_personal_1_nombre} onChange={(e) => set("ref_personal_1_nombre", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input className={inputCls} value={formData.ref_personal_1_cedula} onChange={(e) => set("ref_personal_1_cedula", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input type="tel" className={inputCls} value={formData.ref_personal_1_telefono} onChange={(e) => set("ref_personal_1_telefono", e.target.value)} />
            </div>
            <div className="md:col-span-3 border-t pt-4 font-medium text-sm">Referencia 2</div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input className={inputCls} value={formData.ref_personal_2_nombre} onChange={(e) => set("ref_personal_2_nombre", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula</label>
              <input className={inputCls} value={formData.ref_personal_2_cedula} onChange={(e) => set("ref_personal_2_cedula", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input type="tel" className={inputCls} value={formData.ref_personal_2_telefono} onChange={(e) => set("ref_personal_2_telefono", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Cambios"}
          </Button>
          <Link href="/propietario/reportes/arrendatarios">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
