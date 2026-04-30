"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save, X, Loader2 } from "lucide-react"
import { todayLocalISODate } from "@/lib/utils/calendar-date"
import { fechasPeriodoRecibo } from "@/lib/utils/recibo-periodo"

interface Propiedad {
  id: string
  direccion: string
  ciudad: string
  barrio?: string
  valor_arriendo?: number
}

interface ReciboPago {
  id: string
  propiedad_id: string
  propiedad?: Propiedad
  arrendador_nombre: string
  arrendador_cedula: string
  propietario_nombre: string
  propietario_cedula: string
  valor_arriendo: number
  valor_arriendo_letras: string
  fecha_inicio_periodo: string
  fecha_fin_periodo: string
  tipo_pago: string
  fecha_recibo: string
  numero_recibo: string
  cuenta_consignacion: string
  referencia_pago: string
  nota: string
}

export default function EditarReciboPage() {
  const router = useRouter()
  const params = useParams()
  const reciboId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recibo, setRecibo] = useState<ReciboPago | null>(null)
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])

  const [formData, setFormData] = useState({
    propiedad_id: "",
    arrendador_nombre: "",
    arrendador_cedula: "",
    propietario_nombre: "",
    propietario_cedula: "",
    valor_arriendo: "",
    valor_arriendo_letras: "",
    fecha_inicio_periodo: "",
    fecha_fin_periodo: "",
    tipo_pago: "arriendo",
    fecha_recibo: todayLocalISODate(),
    numero_recibo: "",
    cuenta_consignacion: "",
    referencia_pago: "",
    nota: "",
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(res => res.ok ? res.json() : null),
      fetch(`/api/recibos-pago/${reciboId}`).then(res => res.ok ? res.json() : null),
      fetch("/api/propiedades").then(res => res.ok ? res.json() : []),
    ])
      .then(([userData, reciboData, propiedadesData]) => {
        if (!userData) {
          setError("Error de autenticación")
          setLoading(false)
          return
        }
        if (userData.role === "inquilino") {
          router.replace("/inquilino/dashboard")
          return
        }

        if (!reciboData) {
          setError("Recibo no encontrado")
          setLoading(false)
          return
        }

        setRecibo(reciboData)
        setPropiedades(propiedadesData)

        // Cargar datos del recibo en el formulario
        setFormData({
          propiedad_id: reciboData.propiedad_id || "",
          arrendador_nombre: reciboData.arrendador_nombre || "",
          arrendador_cedula: reciboData.arrendador_cedula || "",
          propietario_nombre: reciboData.propietario_nombre || "",
          propietario_cedula: reciboData.propietario_cedula || "",
          valor_arriendo: String(reciboData.valor_arriendo || ""),
          valor_arriendo_letras: reciboData.valor_arriendo_letras || "",
          fecha_inicio_periodo: reciboData.fecha_inicio_periodo?.split("T")[0] || "",
          fecha_fin_periodo: reciboData.fecha_fin_periodo?.split("T")[0] || "",
          tipo_pago: reciboData.tipo_pago || "arriendo",
          fecha_recibo: reciboData.fecha_recibo?.split("T")[0] || todayLocalISODate(),
          numero_recibo: reciboData.numero_recibo || "",
          cuenta_consignacion: reciboData.cuenta_consignacion || "",
          referencia_pago: reciboData.referencia_pago || "",
          nota: reciboData.nota || "",
        })

        setLoading(false)
      })
      .catch(() => {
        setError("Error al cargar datos")
        setLoading(false)
      })
  }, [router, reciboId])

  const handleChange = (field: string, value: string | number) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }

  const handleSave = async () => {
    if (!formData.propiedad_id || !formData.arrendador_nombre || !formData.valor_arriendo) {
      setError("Por favor completa los campos obligatorios")
      return
    }
    const periodo = fechasPeriodoRecibo(
      formData.tipo_pago,
      formData.fecha_inicio_periodo,
      formData.fecha_fin_periodo
    )
    if (!periodo.ok) {
      setError(periodo.error)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/recibos-pago/${reciboId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }

      alert("Recibo actualizado correctamente")
      router.push(`/propietario/recibos/vista-previa?recibo_id=${reciboId}`)
    } catch (err: any) {
      setError(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const numerosEnLetras = (numero: number): string => {
    if (numero === 0) return "Cero"
    if (numero < 0) return "Menos " + numerosEnLetras(-numero)

    const unidades = [
      "", "Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve",
      "Diez", "Once", "Doce", "Trece", "Catorce", "Quince", "Dieciséis", "Diecisiete", "Dieciocho", "Diecinueve",
    ]
    const decenas = [
      "", "", "Veinte", "Treinta", "Cuarenta", "Cincuenta", "Sesenta", "Setenta", "Ochenta", "Noventa",
    ]
    const centenas = [
      "", "Ciento", "Doscientos", "Trescientos", "Cuatrocientos", "Quinientos", "Seiscientos", "Setecientos", "Ochocientos", "Novecientos",
    ]

    const convertirGrupo = (n: number): string => {
      if (n === 0) return ""
      if (n < 20) return unidades[n]
      if (n < 100) {
        const dec = Math.floor(n / 10)
        const uni = n % 10
        return decenas[dec] + (uni > 0 ? " y " + unidades[uni] : "")
      }
      const cent = Math.floor(n / 100)
      const rest = n % 100
      return centenas[cent] + (rest > 0 ? " " + convertirGrupo(rest) : "")
    }

    if (numero < 1000) {
      return convertirGrupo(numero)
    }

    const millones = Math.floor(numero / 1000000)
    const restoMillones = numero % 1000000
    const miles = Math.floor(restoMillones / 1000)
    const resto = restoMillones % 1000

    let resultado = ""

    if (millones > 0) {
      if (millones === 1) {
        resultado += "Un Millón"
      } else {
        resultado += convertirGrupo(millones) + " Millones"
      }
    }

    if (miles > 0) {
      if (resultado) resultado += " "
      if (miles === 1) {
        resultado += "Mil"
      } else {
        resultado += convertirGrupo(miles) + " Mil"
      }
    }

    if (resto > 0) {
      if (resultado) resultado += " "
      resultado += convertirGrupo(resto)
    }

    return resultado.trim()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div suppressHydrationWarning>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/propietario/recibos/${reciboId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Editar Recibo de Pago</h1>
        {recibo?.numero_recibo && (
          <p className="text-sm text-muted-foreground">N° {recibo.numero_recibo}</p>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="pt-6">
            <p className="text-red-600 font-semibold">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Editar Información del Recibo</CardTitle>
          <CardDescription>Actualiza los campos del recibo de pago</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Propiedad */}
            <div>
              <label className="block text-sm font-medium mb-1">Propiedad *</label>
              <select
                value={formData.propiedad_id}
                onChange={(e) => handleChange("propiedad_id", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona una propiedad</option>
                {propiedades.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.direccion}{prop.barrio ? `, ${prop.barrio}` : ""} ({prop.ciudad})
                  </option>
                ))}
              </select>
            </div>

            {/* Información de Partes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Arrendatario *</label>
                <Input
                  value={formData.arrendador_nombre}
                  onChange={(e) => handleChange("arrendador_nombre", e.target.value)}
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cédula Arrendatario</label>
                <Input
                  value={formData.arrendador_cedula}
                  onChange={(e) => handleChange("arrendador_cedula", e.target.value)}
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Propietario *</label>
                <Input
                  value={formData.propietario_nombre}
                  onChange={(e) => handleChange("propietario_nombre", e.target.value)}
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cédula Propietario</label>
                <Input
                  value={formData.propietario_cedula}
                  onChange={(e) => handleChange("propietario_cedula", e.target.value)}
                  placeholder=""
                />
              </div>
            </div>

            {/* Valores del Arriendo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Valor Arriendo ($) *</label>
                <Input
                  type="number"
                  value={formData.valor_arriendo}
                  onChange={(e) => {
                    handleChange("valor_arriendo", e.target.value)
                    if (e.target.value) {
                      handleChange("valor_arriendo_letras", numerosEnLetras(parseInt(e.target.value)))
                    }
                  }}
                  placeholder=""
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor en Letras</label>
                <Input
                  value={formData.valor_arriendo_letras}
                  onChange={(e) => handleChange("valor_arriendo_letras", e.target.value)}
                  placeholder=""
                />
              </div>
            </div>

            {/* Período (obligatorio solo para arriendo) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha inicio período{formData.tipo_pago === "arriendo" ? " *" : ""}
                </label>
                <Input
                  type="date"
                  value={formData.fecha_inicio_periodo}
                  onChange={(e) => handleChange("fecha_inicio_periodo", e.target.value)}
                  disabled={formData.tipo_pago !== "arriendo"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha fin período{formData.tipo_pago === "arriendo" ? " *" : ""}
                </label>
                <Input
                  type="date"
                  value={formData.fecha_fin_periodo}
                  onChange={(e) => handleChange("fecha_fin_periodo", e.target.value)}
                  disabled={formData.tipo_pago !== "arriendo"}
                />
              </div>
              <p className="text-xs text-muted-foreground md:col-span-2">
                {formData.tipo_pago === "arriendo"
                  ? "Período de canon que cubre este pago."
                  : "Para depósito, servicios u otro no se exige período de canon."}
              </p>
            </div>

            {/* Tipo de Pago y Fecha Recibo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Pago *</label>
                <select
                  value={formData.tipo_pago}
                  onChange={(e) => {
                    const v = e.target.value
                    setFormData((prev) => ({
                      ...prev,
                      tipo_pago: v,
                      ...(v !== "arriendo"
                        ? { fecha_inicio_periodo: "", fecha_fin_periodo: "" }
                        : {}),
                    }))
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="arriendo">Arriendo</option>
                  <option value="deposito">Depósito</option>
                  <option value="servicios">Servicios</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha del Recibo</label>
                <Input
                  type="date"
                  value={formData.fecha_recibo}
                  onChange={(e) => handleChange("fecha_recibo", e.target.value)}
                />
              </div>
            </div>

            {/* Información Bancaria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cuenta de Consignación</label>
                <Input
                  value={formData.cuenta_consignacion}
                  onChange={(e) => handleChange("cuenta_consignacion", e.target.value)}
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referencia de Pago</label>
                <Input
                  value={formData.referencia_pago}
                  onChange={(e) => handleChange("referencia_pago", e.target.value)}
                  placeholder=""
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium mb-1">Notas Adicionales</label>
              <textarea
                value={formData.nota}
                onChange={(e) => handleChange("nota", e.target.value)}
                placeholder=""
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Link href={`/propietario/recibos/${reciboId}`} className="flex-1">
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
