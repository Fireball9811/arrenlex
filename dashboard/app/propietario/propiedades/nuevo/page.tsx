"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ServiciosPropiedad } from "@/components/propiedades/servicios-propiedad"
import { ArrowLeft, CheckCircle, Save, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const formatMoneda = (valor: number): string =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor)

export default function NuevaPropiedadPage() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [nuevaPropiedadId, setNuevaPropiedadId] = useState<string | null>(null)

  const [titulo, setTitulo] = useState("")
  const [direccion, setDireccion] = useState("")
  const [ciudad, setCiudad] = useState("")
  const [barrio, setBarrio] = useState("")
  const [tipo, setTipo] = useState("")
  const [estado, setEstado] = useState("")
  const [habitaciones, setHabitaciones] = useState("")
  const [banos, setBanos] = useState("")
  const [area, setArea] = useState("")
  const [ascensor, setAscensor] = useState("")
  const [depositos, setDepositos] = useState("")
  const [parqueaderos, setParqueaderos] = useState("")
  const [valorArriendoDisplay, setValorArriendoDisplay] = useState("")
  const [valorArriendo, setValorArriendo] = useState(0)
  const [descripcion, setDescripcion] = useState("")
  const [matriculaInmobiliaria, setMatriculaInmobiliaria] = useState("")
  const [cuentaEntidad, setCuentaEntidad] = useState("")
  const [cuentaTipo, setCuentaTipo] = useState("")
  const [cuentaNumero, setCuentaNumero] = useState("")
  const [cuentaTitular, setCuentaTitular] = useState("")
  const [llaveBancaria, setLlaveBancaria] = useState("")

  // Cargar automáticamente los datos bancarios del perfil del propietario
  useEffect(() => {
    const loadBankData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Obtener todos los datos bancarios del perfil del usuario
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("nombre, cuenta_bancaria_1_entidad, cuenta_bancaria_1_numero, cuenta_bancaria_1_tipo, llave_bancaria_1")
          .eq("id", user.id)
          .single()

        if (perfil) {
          // Llenar campos automáticamente si existen datos
          if (perfil.nombre) setCuentaTitular(perfil.nombre)
          if (perfil.cuenta_bancaria_1_entidad) setCuentaEntidad(perfil.cuenta_bancaria_1_entidad)
          if (perfil.cuenta_bancaria_1_numero) setCuentaNumero(perfil.cuenta_bancaria_1_numero)
          if (perfil.cuenta_bancaria_1_tipo) setCuentaTipo(perfil.cuenta_bancaria_1_tipo)
          if (perfil.llave_bancaria_1) setLlaveBancaria(perfil.llave_bancaria_1)
        }
      }
    }
    loadBankData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!direccion.trim() || !ciudad.trim()) {
      setError("Dirección y ciudad son obligatorios")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/propiedades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim() || null,
          direccion: direccion.trim(),
          ciudad: ciudad.trim(),
          barrio: barrio.trim() || null,
          tipo: tipo || "apartamento",
          estado: estado || "disponible",
          habitaciones: parseInt(habitaciones) || 0,
          banos: parseInt(banos) || 0,
          area: parseInt(area) || 0,
          ascensor: parseInt(ascensor) || 0,
          depositos: parseInt(depositos) || 0,
          parqueaderos: parseInt(parqueaderos) || 0,
          valor_arriendo: valorArriendo,
          descripcion: descripcion.trim() || null,
          matricula_inmobiliaria: matriculaInmobiliaria.trim() || null,
          cuenta_bancaria_entidad: cuentaEntidad.trim() || null,
          cuenta_bancaria_tipo: cuentaTipo || null,
          cuenta_bancaria_numero: cuentaNumero.trim() || null,
          cuenta_bancaria_titular: cuentaTitular.trim() || null,
          llave_bancaria: llaveBancaria.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setNuevaPropiedadId(data.id)
      setGuardado(true)
      // Desplazar hacia la sección de servicios
      setTimeout(() => {
        document.getElementById("seccion-servicios")?.scrollIntoView({ behavior: "smooth" })
      }, 200)
    } catch (err: unknown) {
      setError(`Error al guardar: ${err instanceof Error ? err.message : "Error desconocido"}`)
    } finally {
      setSaving(false)
    }
  }

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
  const numInput = "text-center"

  return (
    <div suppressHydrationWarning>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/propietario/propiedades">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Nueva Propiedad</h1>
      </div>

      {/* Banner de éxito */}
      {guardado && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="h-6 w-6 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Propiedad registrada correctamente</p>
            <p className="text-sm text-green-700">Agrega los servicios públicos en la parte inferior.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="off">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* ── Card 1: Información general ── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información de la Propiedad</CardTitle>
            <CardDescription>Completa los datos para registrar una nueva propiedad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Título y Dirección */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Título</label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  autoComplete="off"
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  autoComplete="off"
                  disabled={guardado}
                />
              </div>
            </div>

            {/* Ciudad, Barrio, Tipo, Estado */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Ciudad <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  autoComplete="off"
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Barrio</label>
                <Input
                  value={barrio}
                  onChange={(e) => setBarrio(e.target.value)}
                  autoComplete="off"
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className={selectClass}
                  disabled={guardado}
                >
                  <option value="">Seleccionar...</option>
                  <option value="apartaestudio">Apartaestudio</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="bodega">Bodega</option>
                  <option value="casa">Casa</option>
                  <option value="casaquinta">Casa Quinta</option>
                  <option value="deposito">Depósito</option>
                  <option value="finca">Finca</option>
                  <option value="glamping">Glamping</option>
                  <option value="habitacion">Habitación</option>
                  <option value="local">Local</option>
                  <option value="lote">Lote</option>
                  <option value="oficina">Oficina</option>
                  <option value="parqueadero">Parqueadero</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className={selectClass}
                  disabled={guardado}
                >
                  <option value="">Seleccionar...</option>
                  <option value="disponible">Disponible</option>
                  <option value="arrendado">Arrendado</option>
                  <option value="mantenimiento">En Mantenimiento</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
            </div>

            {/* Características numéricas */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              <div>
                <label className="mb-1 block text-sm font-medium">Habitaciones</label>
                <Input
                  type="number"
                  min="0"
                  className={numInput}
                  value={habitaciones}
                  onChange={(e) => setHabitaciones(e.target.value)}
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Baños</label>
                <Input
                  type="number"
                  min="0"
                  className={numInput}
                  value={banos}
                  onChange={(e) => setBanos(e.target.value)}
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Área (m²)</label>
                <Input
                  type="number"
                  min="0"
                  className={numInput}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Ascensores</label>
                <Input
                  type="number"
                  min="0"
                  className={numInput}
                  value={ascensor}
                  onChange={(e) => setAscensor(e.target.value)}
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Depósitos</label>
                <Input
                  type="number"
                  min="0"
                  className={numInput}
                  value={depositos}
                  onChange={(e) => setDepositos(e.target.value)}
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Parqueaderos</label>
                <Input
                  type="number"
                  min="0"
                  className={numInput}
                  value={parqueaderos}
                  onChange={(e) => setParqueaderos(e.target.value)}
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Canon mensual</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  className="text-right"
                  value={valorArriendoDisplay}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "")
                    const num = parseInt(raw) || 0
                    setValorArriendo(num)
                    setValorArriendoDisplay(num > 0 ? formatMoneda(num) : "")
                  }}
                  onBlur={() => {
                    if (valorArriendo > 0) setValorArriendoDisplay(formatMoneda(valorArriendo))
                  }}
                  disabled={guardado}
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="mb-1 block text-sm font-medium">Descripción</label>
              <textarea
                value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={4}
                  autoComplete="off"
                  disabled={guardado}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Card 2: Legal y bancaria ── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información Legal y Bancaria</CardTitle>
            <CardDescription>Datos de matrícula y cuenta para consignación del arriendo</CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
              ✓ Los datos bancarios se cargaron automáticamente de tu perfil. Puedes editarlos si es necesario.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Matrícula Inmobiliaria</label>
                <Input
                  value={matriculaInmobiliaria}
                  onChange={(e) => setMatriculaInmobiliaria(e.target.value)}
                  autoComplete="off"
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Entidad Bancaria</label>
                <Input
                  value={cuentaEntidad}
                  onChange={(e) => setCuentaEntidad(e.target.value)}
                  autoComplete="off"
                  disabled={guardado}
                  placeholder="Ej: Bancolombia, Nequi, Davivienda..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Tipo de Cuenta</label>
                <select
                  value={cuentaTipo}
                  onChange={(e) => setCuentaTipo(e.target.value)}
                  className={selectClass}
                  disabled={guardado}
                >
                  <option value="">Seleccionar...</option>
                  <option value="ahorros">Ahorros</option>
                  <option value="corriente">Corriente</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Número de Cuenta</label>
                <Input
                  value={cuentaNumero}
                  onChange={(e) => setCuentaNumero(e.target.value)}
                  autoComplete="off"
                  disabled={guardado}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Llave Bancaria</label>
                <Input
                  value={llaveBancaria}
                  onChange={(e) => setLlaveBancaria(e.target.value)}
                  autoComplete="off"
                  disabled={guardado}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Titular</label>
                <Input
                  value={cuentaTitular}
                  onChange={(e) => setCuentaTitular(e.target.value)}
                  autoComplete="off"
                  disabled={guardado}
                  className="bg-muted/50"
                  placeholder="Tu nombre"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Botón guardar ── */}
        {!guardado && (
          <div className="mb-8 flex gap-2">
            <Button type="submit" disabled={saving} className="md:px-8">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Registrar Propiedad"}
            </Button>
            <Link href="/propietario/propiedades">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        )}
      </form>

      {/* ── Card 3: Servicios Públicos ── */}
      <div id="seccion-servicios" className="mb-6">
        {nuevaPropiedadId ? (
          <ServiciosPropiedad propiedadId={nuevaPropiedadId} />
        ) : (
          <Card className="border-dashed opacity-60">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
              <Zap className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-base">Servicios Públicos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                Registra la propiedad primero para poder agregar servicios públicos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Acciones post-guardado ── */}
      {guardado && (
        <div className="flex gap-2 pb-6">
          <Link href="/propietario/propiedades">
            <Button>Ir a mis propiedades</Button>
          </Link>
          <Link href={`/propietario/propiedades/${nuevaPropiedadId}/editar`}>
            <Button variant="outline">Editar propiedad</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
