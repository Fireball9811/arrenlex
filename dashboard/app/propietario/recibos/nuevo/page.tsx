"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save, X } from "lucide-react"

interface Propiedad {
  id: string
  titulo: string
  ciudad: string
  valor_arriendo?: number
}

interface Contrato {
  id: string
  inquilino_id: string
  inquilinos?: {
    nombre: string
    cedula: string
  }
}

export default function NuevoReciboPagoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const propiedadIdParam = searchParams.get("propiedad_id") ?? ""

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])

  const [formData, setFormData] = useState({
    propiedad_id: propiedadIdParam,
    arrendador_nombre: "",
    arrendador_cedula: "",
    propietario_nombre: "",
    propietario_cedula: "",
    valor_arriendo: "",
    valor_arriendo_letras: "",
    fecha_inicio_periodo: "",
    fecha_fin_periodo: "",
    tipo_pago: "arriendo",
    fecha_recibo: new Date().toISOString().split("T")[0],
    numero_recibo: "",
    cuenta_consignacion: "",
    referencia_pago: "",
    nota: "",
  })

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

        // Cargar propiedades del propietario
        return fetch("/api/propiedades")
          .then((res) => (res.ok ? res.json() : []))
          .then((propiedadesData: Propiedad[]) => {
            setPropiedades(propiedadesData)
            // Si llegó propiedad_id por URL, pre-cargar valor de arriendo
            if (propiedadIdParam) {
              const prop = propiedadesData.find((p: Propiedad) => p.id === propiedadIdParam)
              if (prop?.valor_arriendo) {
                setFormData((prev) => ({
                  ...prev,
                  propiedad_id: propiedadIdParam,
                  valor_arriendo: String(prop.valor_arriendo),
                  valor_arriendo_letras: numerosEnLetras(prop.valor_arriendo!),
                }))
              }
            }
            setLoading(false)
          })
      })
      .catch(() => {
        setError("Error de autenticación")
        setLoading(false)
      })
  }, [router, propiedadIdParam])

  // Cargar contratos cuando se selecciona propiedad
  useEffect(() => {
    if (formData.propiedad_id) {
      fetch(`/api/contratos?propiedad_id=${formData.propiedad_id}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          setContratos(data)
        })
        .catch(() => {
          setContratos([])
        })
    }
  }, [formData.propiedad_id])

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

    setSaving(true)
    try {
      const res = await fetch("/api/recibos-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      alert("Recibo creado correctamente")
      router.push(`/propietario/recibos/${data.id}`)
    } catch (err: any) {
      setError(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const numerosEnLetras = (numero: number): string => {
    const unidades = [
      "",
      "Uno",
      "Dos",
      "Tres",
      "Cuatro",
      "Cinco",
      "Seis",
      "Siete",
      "Ocho",
      "Nueve",
    ]
    const decenas = [
      "",
      "",
      "Veinte",
      "Treinta",
      "Cuarenta",
      "Cincuenta",
      "Sesenta",
      "Setenta",
      "Ochenta",
      "Noventa",
    ]
    const centenas = [
      "",
      "Ciento",
      "Doscientos",
      "Trescientos",
      "Cuatrocientos",
      "Quinientos",
      "Seiscientos",
      "Setecientos",
      "Ochocientos",
      "Novecientos",
    ]

    const numero_str = Math.floor(numero).toString().padStart(9, "0")
    let resultado = ""

    const millones = parseInt(numero_str.substring(0, 3))
    const miles = parseInt(numero_str.substring(3, 6))
    const unidad = parseInt(numero_str.substring(6, 9))

    if (millones > 0) {
      if (millones === 1) {
        resultado += "Un Millón "
      } else {
        resultado += `${numerosEnLetras(millones)} Millones `
      }
    }

    if (miles > 0) {
      if (miles === 1) {
        resultado += "Mil "
      } else {
        resultado += `${numerosEnLetras(miles)} Mil `
      }
    }

    if (unidad > 0) {
      resultado += numerosEnLetras(unidad)
    }

    return resultado.trim()
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>
  }

  return (
    <div suppressHydrationWarning>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/propietario/recibos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Crear Recibo de Pago</h1>
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
          <CardTitle>Información del Recibo</CardTitle>
          <CardDescription>Completa todos los campos para generar el recibo de pago</CardDescription>
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
                    {prop.titulo} ({prop.ciudad})
                  </option>
                ))}
              </select>
            </div>

            {/* Información de Partes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Arrendador *</label>
                <Input
                  value={formData.arrendador_nombre}
                  onChange={(e) => handleChange("arrendador_nombre", e.target.value)}
                  placeholder="Nombre completo del arrendador"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cédula Arrendador</label>
                <Input
                  value={formData.arrendador_cedula}
                  onChange={(e) => handleChange("arrendador_cedula", e.target.value)}
                  placeholder="Ej: 1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Propietario *</label>
                <Input
                  value={formData.propietario_nombre}
                  onChange={(e) => handleChange("propietario_nombre", e.target.value)}
                  placeholder="Nombre completo del propietario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cédula Propietario</label>
                <Input
                  value={formData.propietario_cedula}
                  onChange={(e) => handleChange("propietario_cedula", e.target.value)}
                  placeholder="Ej: 1234567890"
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
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor en Letras</label>
                <Input
                  value={formData.valor_arriendo_letras}
                  onChange={(e) => handleChange("valor_arriendo_letras", e.target.value)}
                  placeholder="Auto-completado"
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Período */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Inicio Período *</label>
                <Input
                  type="date"
                  value={formData.fecha_inicio_periodo}
                  onChange={(e) => handleChange("fecha_inicio_periodo", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Fin Período *</label>
                <Input
                  type="date"
                  value={formData.fecha_fin_periodo}
                  onChange={(e) => handleChange("fecha_fin_periodo", e.target.value)}
                />
              </div>
            </div>

            {/* Tipo de Pago */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Pago *</label>
                <select
                  value={formData.tipo_pago}
                  onChange={(e) => handleChange("tipo_pago", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="arriendo">Arriendo</option>
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
                  placeholder="Ej: Cuenta Corriente No. 1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referencia de Pago</label>
                <Input
                  value={formData.referencia_pago}
                  onChange={(e) => handleChange("referencia_pago", e.target.value)}
                  placeholder="Ej: Transferencia, Consignación, Cheque"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium mb-1">Notas Adicionales</label>
              <textarea
                value={formData.nota}
                onChange={(e) => handleChange("nota", e.target.value)}
                placeholder="Notas que desees incluir en el recibo..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Crear Recibo"}
              </Button>
              <Link href="/propietario/recibos" className="flex-1">
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
