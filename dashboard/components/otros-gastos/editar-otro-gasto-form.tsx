"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

type GastoEdit = {
  id: string
  propiedad_id: string
  nombre_completo: string
  cedula: string
  tarjeta_profesional: string | null
  correo_electronico: string | null
  motivo_pago: string
  descripcion_trabajo: string
  fecha_realizacion: string
  valor: number
  banco: string | null
  referencia_pago: string | null
  numero_recibo: string
  estado: string
  propiedades: {
    id: string
    direccion: string
    ciudad: string
    titulo: string
  } | null
}

type Props = {
  id: string
  basePath: string
}

export function EditarOtroGastoForm({ id, basePath }: Props) {
  const { t } = useLang()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [gasto, setGasto] = useState<GastoEdit | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [nombreCompleto, setNombreCompleto] = useState("")
  const [cedula, setCedula] = useState("")
  const [tarjetaProfesional, setTarjetaProfesional] = useState("")
  const [correoElectronico, setCorreoElectronico] = useState("")
  const [motivoPago, setMotivoPago] = useState("")
  const [descripcionTrabajo, setDescripcionTrabajo] = useState("")
  const [fechaRealizacion, setFechaRealizacion] = useState("")
  const [valor, setValor] = useState("")
  const [banco, setBanco] = useState("")
  const [referenciaPago, setReferenciaPago] = useState("")

  const todayStr = new Date().toISOString().split("T")[0]

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/otros-gastos/${id}`)
      if (!res.ok) {
        setGasto(null)
        setLoading(false)
        return
      }
      const data = (await res.json()) as GastoEdit
      setGasto(data)
      setNombreCompleto(data.nombre_completo)
      setCedula(data.cedula)
      setTarjetaProfesional(data.tarjeta_profesional || "")
      setCorreoElectronico(data.correo_electronico || "")
      setMotivoPago(data.motivo_pago)
      setDescripcionTrabajo(data.descripcion_trabajo)
      setFechaRealizacion(String(data.fecha_realizacion).split("T")[0])
      setValor(String(data.valor))
      setBanco(data.banco || "")
      setReferenciaPago(data.referencia_pago || "")
      setLoading(false)
    }
    load()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gasto) return
    setSaving(true)
    setMessage(null)

    const valorNum = parseFloat(valor)
    if (isNaN(valorNum) || valorNum <= 0) {
      setMessage({ type: "error", text: "El valor debe ser mayor a cero" })
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/otros-gastos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        router.push(`${basePath}/${id}`)
      } else {
        setMessage({ type: "error", text: typeof data?.error === "string" ? data.error : "Error al guardar" })
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">{t.comun.cargando}</p>
      </div>
    )
  }

  if (!gasto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-muted-foreground">{t.otrosGastos.sinGastos}</p>
        <Button variant="outline" asChild>
          <Link href={basePath}>{t.comun.volver}</Link>
        </Button>
      </div>
    )
  }

  const refProp =
    gasto.propiedades?.titulo ||
    [gasto.propiedades?.direccion, gasto.propiedades?.ciudad].filter(Boolean).join(", ") ||
    gasto.propiedad_id

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`${basePath}/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.comun.volver}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t.otrosGastos.editarRegistro}</h1>
          <p className="text-sm text-muted-foreground font-mono">
            {gasto.numero_recibo} · {refProp}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t.otrosGastos.editarRegistro}</CardTitle>
          <CardDescription>{t.otrosGastos.historicoCardDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-lg border bg-muted p-3">
            <p className="text-xs text-muted-foreground mb-1">{t.otrosGastos.form.propiedad}</p>
            <p className="text-sm font-medium">{refProp}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.nombreCompleto}</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
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
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.correoElectronico}</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={correoElectronico}
                  onChange={(e) => setCorreoElectronico(e.target.value)}
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
                />
              </div>
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
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.descripcionTrabajo}</label>
              <textarea
                required
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={descripcionTrabajo}
                onChange={(e) => setDescripcionTrabajo(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.valor}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.banco}</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.otrosGastos.form.referenciaPago}</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                />
              </div>
            </div>

            {message && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  message.type === "success"
                    ? "border border-green-200 bg-green-50 text-green-800"
                    : "border border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? t.otrosGastos.guardando : t.comun.guardar}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`${basePath}/${id}`}>{t.comun.cancelar}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
