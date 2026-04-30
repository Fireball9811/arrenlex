"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, DollarSign } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

type Proveedor = {
  nombre_completo: string
  cedula: string
  tarjeta_profesional: string | null
  correo_electronico: string | null
}

export default function NuevoOtroGastoPage() {
  const { t } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const propiedadId = searchParams.get("propiedad_id")
  const propiedadTitulo = searchParams.get("propiedad_titulo")

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [formLoading, setFormLoading] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form state
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [cedula, setCedula] = useState("")
  const [tarjetaProfesional, setTarjetaProfesional] = useState("")
  const [correoElectronico, setCorreoElectronico] = useState("")
  const [motivoPago, setMotivoPago] = useState("")
  const [descripcionTrabajo, setDescripcionTrabajo] = useState("")
  const [fechaRealizacion, setFechaRealizacion] = useState(new Date().toISOString().split('T')[0])
  const [valor, setValor] = useState("")
  const [banco, setBanco] = useState("")
  const [referenciaPago, setReferenciaPago] = useState("")

  const todayStr = new Date().toISOString().split("T")[0]

  useEffect(() => {
    // Verificar que se proporcionó propiedad_id
    if (!propiedadId) {
      router.replace("/propietario/otros-gastos")
      return
    }

    // Cargar proveedores
    fetch("/api/otros-gastos/proveedores")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Proveedor[]) => setProveedores(Array.isArray(data) ? data : []))
      .catch(() => setProveedores([]))
  }, [propiedadId, router])

  const handleProveedorSelect = (cedulaStr: string) => {
    const proveedor = proveedores.find((p) => p.cedula === cedulaStr)
    if (proveedor) {
      setNombreCompleto(proveedor.nombre_completo)
      setCedula(proveedor.cedula)
      setTarjetaProfesional(proveedor.tarjeta_profesional || "")
      setCorreoElectronico(proveedor.correo_electronico || "")
    }
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormMessage(null)

    try {
      if (!propiedadId) {
        setFormMessage({ type: "error", text: "No se seleccionó la propiedad" })
        setFormLoading(false)
        return
      }

      const valorNum = parseFloat(valor)
      if (isNaN(valorNum) || valorNum <= 0) {
        setFormMessage({ type: "error", text: "El valor debe ser mayor a cero" })
        setFormLoading(false)
        return
      }

      const res = await fetch("/api/otros-gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propiedad_id: propiedadId,
          nombre_completo: nombreCompleto.trim(),
          cedula: cedula.trim(),
          tarjeta_profesional: tarjetaProfesional.trim() || null,
          correo_electronico: correoElectronico.trim() || null,
          motivo_pago: motivoPago.trim(),
          descripcion_trabajo: descripcionTrabajo.trim(),
          fecha_realizacion: fechaRealizacion,
          valor: valorNum,
          banco: banco.trim() || null,
          referencia_pago: referenciaPago.trim() || null,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setFormMessage({ type: "success", text: "Gasto registrado correctamente" })
        // Reset form
        setNombreCompleto("")
        setCedula("")
        setTarjetaProfesional("")
        setCorreoElectronico("")
        setMotivoPago("")
        setDescripcionTrabajo("")
        setFechaRealizacion(todayStr)
        setValor("")
        setBanco("")
        setReferenciaPago("")

        // Redirigir al recibo después de 1.5 segundos
        setTimeout(() => {
          router.push(`/propietario/otros-gastos/${data.id}`)
        }, 1500)
      } else {
        setFormMessage({ type: "error", text: data.error || "Error al registrar el gasto" })
      }
    } catch {
      setFormMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setFormLoading(false)
    }
  }

  const formatValor = (val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) return ""
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.comun.volver}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t.otrosGastos.nuevoGasto}</h1>
          <p className="text-sm text-muted-foreground">
            Propiedad: <span className="font-medium text-green-700">{propiedadTitulo || propiedadId}</span>
          </p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t.otrosGastos.cardTitulo}</CardTitle>
          <CardDescription>{t.otrosGastos.cardDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            {/* Propiedad pre-seleccionada y bloqueada */}
            <div className="p-3 bg-muted rounded-lg border">
              <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.propiedad}</label>
              <input
                type="text"
                value={propiedadTitulo || propiedadId || ""}
                disabled
                className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  {t.otrosGastos.form.autocompletar}
                </label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleProveedorSelect(e.target.value)
                  }}
                >
                  <option value="">Seleccionar proveedor del historial...</option>
                  {proveedores.map((p) => (
                    <option key={p.cedula} value={p.cedula}>
                      {p.nombre_completo} - {p.cedula}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.nombreCompleto}</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder={t.otrosGastos.form.placeholderNombre}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.cedula}</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder={t.otrosGastos.form.placeholderCedula}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.tarjetaProfesional}</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={tarjetaProfesional}
                  onChange={(e) => setTarjetaProfesional(e.target.value)}
                  placeholder={t.otrosGastos.form.placeholderTarjeta}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.correoElectronico}</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={correoElectronico}
                  onChange={(e) => setCorreoElectronico(e.target.value)}
                  placeholder={t.otrosGastos.form.placeholderCorreo}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.motivoPago}</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={motivoPago}
                  onChange={(e) => setMotivoPago(e.target.value)}
                  placeholder={t.otrosGastos.form.placeholderMotivo}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.valor}</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-16"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0"
                  />
                  {valor && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {formatValor(valor)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.descripcionTrabajo}</label>
              <textarea
                required
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={descripcionTrabajo}
                onChange={(e) => setDescripcionTrabajo(e.target.value)}
                placeholder={t.otrosGastos.form.placeholderDescripcion}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.fechaRealizacion}</label>
                <input
                  type="date"
                  required
                  max={todayStr}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={fechaRealizacion}
                  onChange={(e) => setFechaRealizacion(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.banco}</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  placeholder={t.otrosGastos.form.placeholderBanco}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.referenciaPago}</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={referenciaPago}
                onChange={(e) => setReferenciaPago(e.target.value)}
                placeholder={t.otrosGastos.form.placeholderReferencia}
              />
            </div>

            {formMessage && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  formMessage.type === "success"
                    ? "border border-green-200 bg-green-50 text-green-800"
                    : "border border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {formMessage.text}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={formLoading} className="flex-1">
                <DollarSign className="mr-2 h-4 w-4" />
                {formLoading ? t.otrosGastos.guardando : t.otrosGastos.guardar}
              </Button>
              <Button type="button" variant="outline" disabled={formLoading} onClick={() => router.back()}>
                {t.comun.cancelar}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
