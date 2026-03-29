"use client"

"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowLeft, Save, X, Info } from "lucide-react"
import { GaleríaImagenes } from "@/components/propiedades/galeria-imagenes"
import { ServiciosPropiedad } from "@/components/propiedades/servicios-propiedad"
import type { PropiedadImagen } from "@/lib/types/database"

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
  notificaciones_email?: boolean
  valor_inmueble?: number | null
  gastos_operativos?: number | null
  cap?: number | null
  grm?: number | null
  cuota_mensual?: number | null
  intereses_anuales?: number | null
  cash_on_cash?: number | null
  ber?: number | null
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

// Función para calcular CAP
const calcularCAP = (valorArriendo: number, gastosOperativos: number, valorInmueble: number): number | null => {
  if (!valorArriendo || !valorInmueble || valorInmueble === 0) return null
  const ingresoAnual = valorArriendo * 12
  const resultado = ((ingresoAnual - gastosOperativos) / valorInmueble) * 100
  return Math.round(resultado * 100) / 100 // Redondear a 2 decimales
}

// Función para calcular GRM (Gross Rent Multiplier) - Porcentaje de retorno bruto anual
const calcularGRM = (valorArriendo: number, valorInmueble: number): number | null => {
  if (!valorArriendo || !valorInmueble || valorInmueble === 0) return null
  const ingresoAnual = valorArriendo * 12
  const resultado = (ingresoAnual / valorInmueble) * 100
  return Math.round(resultado * 100) / 100 // Redondear a 2 decimales
}

// Función para calcular Cash on Cash
const calcularCashOnCash = (valorArriendo: number, gastosOperativos: number, cuotaMensual: number, valorInmueble: number): number | null => {
  if (!valorArriendo || !valorInmueble || valorInmueble === 0) return null
  const ingresoAnual = valorArriendo * 12
  const cuotaAnual = cuotaMensual * 12
  const resultado = ((ingresoAnual - gastosOperativos - cuotaAnual) / valorInmueble) * 100
  return Math.round(resultado * 100) / 100 // Redondear a 2 decimales
}

// Función para calcular BER (Break-Even Rent)
const calcularBER = (gastosOperativos: number, cuotaMensual: number): number | null => {
  if (cuotaMensual === 0) return null
  const gastosMensuales = gastosOperativos / 12
  const resultado = gastosMensuales + cuotaMensual
  return Math.round(resultado)
}

export default function EditarPropiedadPage() {
  const router = useRouter()
  const params = useParams()
  const propiedadId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)
  const [imagenes, setImagenes] = useState<PropiedadImagen[]>([])
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

  // Estados para campos financieros
  const [valorInmuebleDisplay, setValorInmuebleDisplay] = useState("")
  const [gastosOperativosDisplay, setGastosOperativosDisplay] = useState("")
  const [capCalculado, setCapCalculado] = useState<number | null>(null)
  const [grmCalculado, setGrmCalculado] = useState<number | null>(null)
  const [cashOnCashCalculado, setCashOnCashCalculado] = useState<number | null>(null)
  const [berCalculado, setBerCalculado] = useState<number | null>(null)
  const [gastosOperativosEditadoManualmente, setGastosOperativosEditadoManualmente] = useState(false)
  const [cuotaMensualDisplay, setCuotaMensualDisplay] = useState("")
  const [interesesAnualesDisplay, setInteresesAnualesDisplay] = useState("")

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

        // Cargar la propiedad e imágenes en paralelo
        const [propRes, imgData] = await Promise.all([
          fetch(`/api/propiedades/${propiedadId}`),
          fetch(`/api/propiedades/${propiedadId}/imagenes`)
            .then((r) => r.json())
            .catch(() => []),
        ])

        setImagenes(imgData)

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

        // Inicializar campos financieros
        setValorInmuebleDisplay(formatMoneda(propData.valor_inmueble || 0))
        // Si no hay gastos operativos, calcular el 20% del ingreso anual
        const gastosOperativosIniciales = propData.gastos_operativos ?? (propData.valor_arriendo ? (propData.valor_arriendo * 12) * 0.20 : 0)
        setGastosOperativosDisplay(formatMoneda(gastosOperativosIniciales))
        // Marcar como editado manualmente solo si ya tenía un valor guardado
        setGastosOperativosEditadoManualmente(propData.gastos_operativos !== null && propData.gastos_operativos !== undefined)
        setCapCalculado(propData.cap || null)
        setGrmCalculado(propData.grm || null)
        setCashOnCashCalculado(propData.cash_on_cash || null)
        setBerCalculado(propData.ber || null)
        setCuotaMensualDisplay(formatMoneda(propData.cuota_mensual || 0))
        setInteresesAnualesDisplay(propData.intereses_anuales?.toString() || "")

        setLoading(false)
      } catch (err) {
        console.error("Error general:", err)
        setError(`Error: ${err instanceof Error ? err.message : "Error desconocido"}`)
        setLoading(false)
      }
    }

    cargarDatos()
  }, [router, propiedadId])

  // Calcular CAP, GRM y Cash on Cash automáticamente cuando cambian los valores
  useEffect(() => {
    if (propiedad) {
      const valorArriendo = propiedad.valor_arriendo || 0
      const valorInmueble = propiedad.valor_inmueble || 0
      const cuotaMensual = propiedad.cuota_mensual || 0
      let gastosOperativos = propiedad.gastos_operativos || 0

      // Si no se han editado manualmente los gastos operativos, calcular el 20% del ingreso anual
      if (!gastosOperativosEditadoManualmente && valorArriendo > 0) {
        gastosOperativos = (valorArriendo * 12) * 0.20
        setGastosOperativosDisplay(formatMoneda(gastosOperativos))
        setPropiedad(prev => prev ? {
          ...prev,
          gastos_operativos: gastosOperativos
        } : null)
      }

      const cap = calcularCAP(valorArriendo, gastosOperativos, valorInmueble)
      const grm = calcularGRM(valorArriendo, valorInmueble)
      const cashOnCash = calcularCashOnCash(valorArriendo, gastosOperativos, cuotaMensual, valorInmueble)
      const ber = calcularBER(gastosOperativos, cuotaMensual)

      setCapCalculado(cap)
      setGrmCalculado(grm)
      setCashOnCashCalculado(cashOnCash)
      setBerCalculado(ber)

      // Actualizar el objeto propiedad con los valores calculados
      setPropiedad(prev => prev ? {
        ...prev,
        cap: cap,
        grm: grm,
        cash_on_cash: cashOnCash,
        ber: ber
      } : null)
    }
  }, [propiedad?.valor_arriendo, propiedad?.valor_inmueble, propiedad?.cuota_mensual, propiedad?.gastos_operativos])

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

      router.push("/propiedades")
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
        <Link href="/propiedades">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Editar Propiedad</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
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

            {/* Indicadores Financieros */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Indicadores Financieros</h3>

              {/* Primera fila: Datos de entrada */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4">
                {/* Valor del Inmueble */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Valor del Inmueble</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="$ 0"
                    value={valorInmuebleDisplay}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "")
                      const numVal = parseInt(val) || 0
                      setValorInmuebleDisplay(formatMoneda(numVal))
                      handleChange("valor_inmueble", numVal || null)
                    }}
                  />
                </div>

                {/* Gastos Operativos */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    Gastos Operativos
                    {!gastosOperativosEditadoManualmente && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">20% ingresos anuales</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="$ 0"
                    value={gastosOperativosDisplay}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "")
                      const numVal = parseInt(val) || 0
                      setGastosOperativosDisplay(formatMoneda(numVal))
                      handleChange("gastos_operativos", numVal || null)
                      setGastosOperativosEditadoManualmente(true)
                    }}
                  />
                </div>

                {/* Cuota Mensual */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Cuota Mensual</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="$ 0"
                    value={cuotaMensualDisplay}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "")
                      const numVal = parseInt(val) || 0
                      setCuotaMensualDisplay(formatMoneda(numVal))
                      handleChange("cuota_mensual", numVal || null)
                    }}
                  />
                </div>

                {/* Intereses Anuales - mitad del tamaño */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Intereses Anuales (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={interesesAnualesDisplay}
                    onChange={(e) => {
                      const numVal = parseFloat(e.target.value) || 0
                      setInteresesAnualesDisplay(e.target.value)
                      handleChange("intereses_anuales", numVal || null)
                    }}
                  />
                </div>
              </div>

              {/* Segunda fila: Indicadores calculados */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-3 text-slate-700">Indicadores Calculados</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CAP (Cap Rate) */}
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                      CAP (Cap Rate)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">El Cap Rate muestra la rentabilidad anual de una propiedad.</p>
                            <p className="text-sm mt-2">Se calcula tomando el ingreso anual por arriendo, restando los gastos, y dividiendo ese resultado por el valor del inmueble.</p>
                            <p className="text-sm mt-2 font-medium">El porcentaje final indica cuánto está produciendo la inversión cada año sobre su precio de compra.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <Input
                      type="text"
                      readOnly
                      value={capCalculado !== null ? `${capCalculado.toFixed(2)}%` : "---"}
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>

                  {/* GRM (Gross Rent Multiplier) */}
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                      GRM
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">El GRM (Gross Rent Multiplier) es un indicador que muestra el porcentaje de retorno bruto anual.</p>
                            <p className="text-sm mt-2">Se calcula dividiendo el ingreso anual por renta entre el valor del inmueble, sin descontar gastos.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <Input
                      type="text"
                      readOnly
                      value={grmCalculado !== null ? `${grmCalculado.toFixed(2)}%` : "---"}
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>

                  {/* Cash on Cash */}
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                      Cash on Cash
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">El Cash on Cash es un indicador que muestra la rentabilidad anual real del dinero que efectivamente invertiste de tu bolsillo.</p>
                            <p className="text-sm mt-2">Se calcula dividiendo el flujo de efectivo anual (ganancia después de gastos y deuda) entre el capital propio invertido.</p>
                            <p className="text-sm mt-2 font-medium">El resultado es un porcentaje que indica cuánto está generando tu dinero cada año sobre lo que realmente aportaste.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <Input
                      type="text"
                      readOnly
                      value={cashOnCashCalculado !== null ? `${cashOnCashCalculado.toFixed(2)}%` : "---"}
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>

                  {/* BER (Break-Even Rent) */}
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                      BER (Arriendo Mínimo)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">Indica el arriendo mínimo que debe generar el inmueble para cubrir todos los costos (gastos operativos + cuota del crédito).</p>
                            <p className="text-sm mt-2">Si el arriendo real está por debajo de este valor, la inversión genera flujo negativo.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                    <Input
                      type="text"
                      readOnly
                      value={berCalculado !== null ? formatMoneda(berCalculado) : "---"}
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle de notificaciones por correo */}
            <div className="border-t pt-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={propiedad.notificaciones_email ?? false}
                    onChange={(e) => handleChange("notificaciones_email", e.target.checked)}
                  />
                  <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium">Notificaciones por correo</span>
                  <p className="text-xs text-muted-foreground">
                    Envía recordatorios automáticos de vencimiento de contrato al propietario y arrendatarios
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Link href="/propiedades" className="flex-1">
                <Button variant="outline" className="w-full">
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Servicios Públicos */}
      <div className="mt-6">
        <ServiciosPropiedad propiedadId={propiedadId} />
      </div>
      </div>

      {/* Galería de fotos */}
      <div className="xl:col-span-1">
        <h2 className="text-xl font-semibold mb-4">Fotos de la Propiedad</h2>
        <GaleríaImagenes
          propiedadId={propiedadId}
          imagenes={imagenes}
          onImagenesChange={setImagenes}
          readonly={loading}
        />
      </div>
      </div>
    </div>
  )
}
