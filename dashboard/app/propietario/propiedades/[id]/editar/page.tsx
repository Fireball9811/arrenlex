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
  numero_matricula?: string
  ascensor?: number
  depositos?: number
  parqueaderos?: number
  cuenta_bancaria_entidad?: string
  cuenta_bancaria_tipo?: string
  cuenta_bancaria_numero?: string
  cuenta_bancaria_titular?: string
}

// Función para formatear moneda colombiana
const formatMoneda = (valor: number): string => {
  if (!valor) return ""
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor)
}

// Función para parsear valor de moneda (elimina símbolos y puntos)
const parseMoneda = (valor: string): number => {
  const limpio = valor.replace(/[$\s.]/g, "").replace(/,/g, "")
  const num = parseInt(limpio)
  return isNaN(num) ? 0 : num
}

export default function EditarPropiedadPage() {
  const router = useRouter()
  const params = useParams()
  const propiedadId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)
  const [datosPropietario, setDatosPropietario] = useState<{
    cuenta_bancaria_1_numero?: string | null
    cuenta_bancaria_1_titular?: string | null
  } | null>(null)

  // Estados para manejar los valores string de los inputs
  const [valorArriendoDisplay, setValorArriendoDisplay] = useState("")
  const [habitacionesDisplay, setHabitacionesDisplay] = useState("")
  const [banosDisplay, setBanosDisplay] = useState("")
  const [areaDisplay, setAreaDisplay] = useState("")
  const [ascensorDisplay, setAscensorDisplay] = useState("")
  const [depositosDisplay, setDepositosDisplay] = useState("")
  const [parqueaderosDisplay, setParqueaderosDisplay] = useState("")

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

        // Cargar datos bancarios del propietario desde perfiles
        try {
          const perfilRes = await fetch("/api/auth/me")
          if (perfilRes.ok) {
            const perfilData = await perfilRes.json()
            // Obtener datos bancarios del propietario
            const datosBancariosPropietario = {
              cuenta_bancaria_1_numero: perfilData.cuenta_bancaria_1_numero,
              cuenta_bancaria_1_titular: perfilData.nombre || null,
            }
            setDatosPropietario(datosBancariosPropietario)

            // Si la propiedad no tiene datos bancarios, usar los del propietario
            const propiedadConDatosBancarios = {
              ...propData,
              cuenta_bancaria_numero: propData.cuenta_bancaria_numero || datosBancariosPropietario.cuenta_bancaria_1_numero,
              cuenta_bancaria_titular: propData.cuenta_bancaria_titular || datosBancariosPropietario.cuenta_bancaria_1_titular,
            }
            setPropiedad(propiedadConDatosBancarios)
          } else {
            setPropiedad(propData)
          }
        } catch (err) {
          console.log("No se pudo cargar datos del propietario, usando datos de propiedad")
          setPropiedad(propData)
        }

        // Inicializar los displays
        setValorArriendoDisplay(formatMoneda(propData.valor_arriendo || 0))
        setHabitacionesDisplay(propData.habitaciones?.toString() || "")
        setBanosDisplay(propData.banos?.toString() || "")
        setAreaDisplay(propData.area?.toString() || "")
        setAscensorDisplay(propData.ascensor?.toString() || "")
        setDepositosDisplay(propData.depositos?.toString() || "")
        setParqueaderosDisplay(propData.parqueaderos?.toString() || "")

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

      router.push("/propietario/propiedades")
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
        <Link href="/propietario/propiedades">
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
            {/* Número de Matrícula - Solo lectura */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-blue-900">Número de Matrícula</label>
                  <p className="text-xs text-blue-600">Identificador único de la propiedad</p>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {propiedad.numero_matricula || "---"}
                </div>
              </div>
            </div>

            {/* Título y Dirección - misma línea */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <Input
                  value={propiedad.titulo || ""}
                  onChange={(e) => handleChange("titulo", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dirección</label>
                <Input
                  value={propiedad.direccion}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                />
              </div>
            </div>

            {/* Ciudad, Barrio, Tipo y Estado - misma línea (4 columnas) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ciudad</label>
                <Input
                  value={propiedad.ciudad}
                  onChange={(e) => handleChange("ciudad", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Barrio</label>
                <Input
                  value={propiedad.barrio || ""}
                  onChange={(e) => handleChange("barrio", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={propiedad.tipo || "apartamento"}
                  onChange={(e) => handleChange("tipo", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="apartamento">Apartamento</option>
                  <option value="apartaestudio">Apartaestudio</option>
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              <div>
                <label className="block text-sm font-medium mb-1">Habitaciones</label>
                <Input
                  type="number"
                  value={habitacionesDisplay}
                  onChange={(e) => {
                    const val = e.target.value
                    setHabitacionesDisplay(val)
                    handleChange("habitaciones", val === "" ? 0 : parseInt(val) || 0)
                  }}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Baños</label>
                <Input
                  type="number"
                  value={banosDisplay}
                  onChange={(e) => {
                    const val = e.target.value
                    setBanosDisplay(val)
                    handleChange("banos", val === "" ? 0 : parseInt(val) || 0)
                  }}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Área (m²)</label>
                <Input
                  type="number"
                  value={areaDisplay}
                  onChange={(e) => {
                    const val = e.target.value
                    setAreaDisplay(val)
                    handleChange("area", val === "" ? 0 : parseInt(val) || 0)
                  }}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ascensores</label>
                <Input
                  type="number"
                  value={ascensorDisplay}
                  onChange={(e) => {
                    const val = e.target.value
                    setAscensorDisplay(val)
                    handleChange("ascensor", val === "" ? 0 : parseInt(val) || 0)
                  }}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Depósitos</label>
                <Input
                  type="number"
                  value={depositosDisplay}
                  onChange={(e) => {
                    const val = e.target.value
                    setDepositosDisplay(val)
                    handleChange("depositos", val === "" ? 0 : parseInt(val) || 0)
                  }}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Parqueaderos</label>
                <Input
                  type="number"
                  value={parqueaderosDisplay}
                  onChange={(e) => {
                    const val = e.target.value
                    setParqueaderosDisplay(val)
                    handleChange("parqueaderos", val === "" ? 0 : parseInt(val) || 0)
                  }}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor Arriendo</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={valorArriendoDisplay}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "")
                    const numVal = parseInt(val) || 0
                    setValorArriendoDisplay(formatMoneda(numVal))
                    handleChange("valor_arriendo", numVal)
                  }}
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={propiedad.descripcion || ""}
                onChange={(e) => handleChange("descripcion", e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Información Legal y Bancaria */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Información Legal y Bancaria</h3>

              {/* Matrícula Inmobiliaria, Entidad Bancaria, Tipo de Cuenta - misma línea */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Matrícula Inmobiliaria</label>
                  <Input
                    value={propiedad.matricula_inmobiliaria || ""}
                    onChange={(e) => handleChange("matricula_inmobiliaria", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Entidad Bancaria</label>
                  <Input
                    value={propiedad.cuenta_bancaria_entidad || ""}
                    onChange={(e) => handleChange("cuenta_bancaria_entidad", e.target.value)}
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

              {/* Número de Cuenta y Titular - misma línea (con indicador de auto-llenado) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Número de Cuenta
                    {datosPropietario?.cuenta_bancaria_1_numero && (
                      <span className="ml-2 text-xs text-green-600">✓ Del propietario</span>
                    )}
                  </label>
                  <Input
                    value={propiedad.cuenta_bancaria_numero || ""}
                    onChange={(e) => handleChange("cuenta_bancaria_numero", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Titular de la Cuenta
                    {datosPropietario?.cuenta_bancaria_1_titular && (
                      <span className="ml-2 text-xs text-green-600">✓ Del propietario</span>
                    )}
                  </label>
                  <Input
                    value={propiedad.cuenta_bancaria_titular || ""}
                    onChange={(e) => handleChange("cuenta_bancaria_titular", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Link href="/propietario/propiedades" className="flex-1">
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
