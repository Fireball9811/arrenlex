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
  direccion: string
  ciudad: string
  barrio?: string
  valor_arriendo?: number
  user_id: string
}

interface Arrendatario {
  id: string
  nombre: string
  cedula: string
}

interface Contrato {
  id: string
  arrendatario_id: string
  arrendatario?: Arrendatario
  estado: string
}

interface AuthUser {
  id: string
  email: string
  role: string
  nombre: string
  cedula: string
}

export default function NuevoReciboPagoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const propiedadIdParam = searchParams.get("propiedad_id") ?? ""

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])

  const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr + "T12:00:00")
    d.setDate(d.getDate() + days)
    return d.toISOString().split("T")[0]
  }

  const cargarUltimoRecibo = async (propiedadId: string) => {
    try {
      const res = await fetch(`/api/recibos-pago?propiedad_id=${propiedadId}`)
      if (!res.ok) return
      const recibos = await res.json()
      if (recibos.length > 0) {
        const ultimo = recibos[0]
        const fechaFin = ultimo.fecha_fin_periodo?.split("T")[0]
        if (fechaFin) {
          const nuevaInicio = addDays(fechaFin, 1)
          const nuevaFin = addDays(nuevaInicio, 30)
          setFormData((prev) => ({
            ...prev,
            fecha_inicio_periodo: prev.fecha_inicio_periodo || nuevaInicio,
            fecha_fin_periodo: prev.fecha_fin_periodo || nuevaFin,
          }))
        }
      }
    } catch {
      // Silencioso
    }
  }

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
    cuenta_consignacion: "",
    referencia_pago: "",
    nota: "",
  })

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) {
          setError("Error de autenticación")
          setLoading(false)
          return
        }

        const data: AuthUser = await res.json()

        if (data.role === "inquilino") {
          router.replace("/inquilino/dashboard")
          return
        }

        const isAdmin = data.role === "admin"

        // Cargar propiedades
        const resPropiedades = await fetch("/api/propiedades")
        if (!resPropiedades.ok) {
          setError("Error cargando propiedades")
          setLoading(false)
          return
        }

        const propiedadesData: Propiedad[] = await resPropiedades.json()
        setPropiedades(propiedadesData)
        setLoading(false)

        // Si hay propiedad_id en URL, cargar datos iniciales UNA SOLA VEZ
        if (propiedadIdParam) {
          const prop = propiedadesData.find((p: Propiedad) => p.id === propiedadIdParam)
          if (prop) {
            const valorArriendo = prop.valor_arriendo || 0

            // Pre-llenar SOLO si los campos están completamente vacíos
            setFormData((prev) => ({
              ...prev,
              propiedad_id: propiedadIdParam,
              propietario_nombre: prev.propietario_nombre || (isAdmin ? "" : data.nombre || ""),
              propietario_cedula: prev.propietario_cedula || (isAdmin ? "" : data.cedula || ""),
              valor_arriendo: prev.valor_arriendo || String(valorArriendo),
              valor_arriendo_letras: prev.valor_arriendo_letras || (valorArriendo > 0 ? numerosEnLetras(valorArriendo) : ""),
            }))

            // Cargar datos del propietario si es admin y no tiene datos
            if (isAdmin && prop.user_id) {
              try {
                const userRes = await fetch(`/api/auth/role?user_id=${prop.user_id}`)
                if (userRes.ok) {
                  const userData = await userRes.json()
                  setFormData((prev) => ({
                    ...prev,
                    propietario_nombre: prev.propietario_nombre || userData.nombre || "",
                    propietario_cedula: prev.propietario_cedula || userData.cedula || "",
                  }))
                }
              } catch (e) {
                // Silencioso
              }
            }

            // Cargar arrendatario
            try {
              const resContratos = await fetch(`/api/contratos?propiedad_id=${propiedadIdParam}&estado=activo`)
              if (resContratos.ok) {
                const contratos = await resContratos.json()
                if (contratos.length > 0 && contratos[0].arrendatario) {
                  const arrendatario = contratos[0].arrendatario
                  setFormData((prev) => ({
                    ...prev,
                    arrendador_nombre: prev.arrendador_nombre || arrendatario.nombre || "",
                    arrendador_cedula: prev.arrendador_cedula || arrendatario.cedula || "",
                  }))
                }
              }
            } catch (e) {
              // Silencioso
            }

            // Cargar fechas desde el último recibo de la propiedad
            await cargarUltimoRecibo(propiedadIdParam)
          }
        } else if (!isAdmin) {
          // Si no hay propiedad seleccionada y es propietario, cargar sus datos
          setFormData((prev) => ({
            ...prev,
            propietario_nombre: data.nombre || "",
            propietario_cedula: data.cedula || "",
          }))
        }
      } catch (err) {
        console.error("Error:", err)
        setError("Error de conexión")
        setLoading(false)
      }
    }

    cargarDatosIniciales()
  }, [router, propiedadIdParam])

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePropiedadChange = async (propiedadId: string) => {
    setFormData((prev) => ({
      ...prev,
      propiedad_id: propiedadId,
      fecha_inicio_periodo: "",
      fecha_fin_periodo: "",
    }))
    if (propiedadId) {
      await cargarUltimoRecibo(propiedadId)
    }
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
      router.push(`/propietario/recibos/vista-previa?recibo_id=${data.id}`)
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
      "Diez",
      "Once",
      "Doce",
      "Trece",
      "Catorce",
      "Quince",
      "Dieciséis",
      "Diecisiete",
      "Dieciocho",
      "Diecinueve",
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
                onChange={(e) => handlePropiedadChange(e.target.value)}
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
                <label className="block text-sm font-medium mb-1">Nombre Arrendador *</label>
                <Input
                  value={formData.arrendador_nombre}
                  onChange={(e) => handleChange("arrendador_nombre", e.target.value)}
                  placeholder="Nombre del arrendatario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cédula Arrendador</label>
                <Input
                  value={formData.arrendador_cedula}
                  onChange={(e) => handleChange("arrendador_cedula", e.target.value)}
                  placeholder="Cédula del arrendatario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Propietario *</label>
                <Input
                  value={formData.propietario_nombre}
                  onChange={(e) => handleChange("propietario_nombre", e.target.value)}
                  placeholder="Nombre del propietario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cédula Propietario</label>
                <Input
                  value={formData.propietario_cedula}
                  onChange={(e) => handleChange("propietario_cedula", e.target.value)}
                  placeholder="Cédula del propietario"
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
                    if (e.target.value && !isNaN(Number(e.target.value))) {
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
                  placeholder="Se llena automáticamente"
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

            {/* Tipo de Pago y Fecha del Recibo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Pago *</label>
                <select
                  value={formData.tipo_pago}
                  onChange={(e) => handleChange("tipo_pago", e.target.value)}
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
                  placeholder="Número de cuenta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referencia de Pago</label>
                <Input
                  value={formData.referencia_pago}
                  onChange={(e) => handleChange("referencia_pago", e.target.value)}
                  placeholder="Referencia"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium mb-1">Notas Adicionales</label>
              <textarea
                value={formData.nota}
                onChange={(e) => handleChange("nota", e.target.value)}
                placeholder="Notas adicionales..."
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
