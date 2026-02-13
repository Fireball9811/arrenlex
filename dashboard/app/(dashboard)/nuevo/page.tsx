"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Solo dígitos, máximo 10 (celular Colombia). */
function soloDigitosMax10(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10)
}

/** Formato (XXX) XXX-XXXX para teléfono. */
function formatTelefono(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10)
  if (d.length <= 3) return d ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/** Formato miles con punto (Colombia): 1.234.567 */
function formatMoneda(digits: string): string {
  const d = digits.replace(/\D/g, "")
  if (!d) return ""
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/** Formato cédula con puntos: 1.234.567.890 */
function formatCedula(digits: string): string {
  const d = digits.replace(/\D/g, "")
  if (!d) return ""
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/** Clase para input cuando tiene valor (verde suave). */
const inputFilledClass =
  "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50"

const PARENTESCOS = [
  "Padre",
  "Madre",
  "Hermano",
  "Hermana",
  "Tío",
  "Tía",
  "Primo",
  "Prima",
  "Abuelo",
  "Abuela",
  "Esposo(a)",
  "Hijo(a)",
  "Otro",
] as const

const inputRow = "grid gap-4 sm:grid-cols-2"

export default function NuevoArrendatarioPage() {
  const [role, setRole] = useState<"admin" | "propietario" | "inquilino" | null>(null)
  const [adultosHabitantes, setAdultosHabitantes] = useState("")
  const [ninosHabitantes, setNinosHabitantes] = useState("")
  const [mascotasCantidad, setMascotasCantidad] = useState("")
  const [vehiculosCantidad, setVehiculosCantidad] = useState("")
  const [vehiculosPlacas, setVehiculosPlacas] = useState("")
  const [autorizacionDatos, setAutorizacionDatos] = useState(false)
  const [nombre, setNombre] = useState("")
  const [cedula, setCedula] = useState("")
  const [telefono, setTelefono] = useState("")
  const [coarrendatarioNombre, setCoarrendatarioNombre] = useState("")
  const [coarrendatarioCedula, setCoarrendatarioCedula] = useState("")
  const [coarrendatarioTelefono, setCoarrendatarioTelefono] = useState("")
  const [salarioPrincipal, setSalarioPrincipal] = useState("")
  const [salarioSecundario, setSalarioSecundario] = useState("")
  const [tiempoServicioPrincipalMeses, setTiempoServicioPrincipalMeses] = useState("")
  const [tiempoServicioSecundarioMeses, setTiempoServicioSecundarioMeses] = useState("")
  const [empresaPrincipal, setEmpresaPrincipal] = useState("")
  const [empresaSecundaria, setEmpresaSecundaria] = useState("")
  const [refFamiliar1Nombre, setRefFamiliar1Nombre] = useState("")
  const [refFamiliar1Parentesco, setRefFamiliar1Parentesco] = useState("")
  const [refFamiliar1Cedula, setRefFamiliar1Cedula] = useState("")
  const [refFamiliar1Telefono, setRefFamiliar1Telefono] = useState("")
  const [refFamiliar2Nombre, setRefFamiliar2Nombre] = useState("")
  const [refFamiliar2Parentesco, setRefFamiliar2Parentesco] = useState("")
  const [refFamiliar2Cedula, setRefFamiliar2Cedula] = useState("")
  const [refFamiliar2Telefono, setRefFamiliar2Telefono] = useState("")
  const [refPersonal1Nombre, setRefPersonal1Nombre] = useState("")
  const [refPersonal1Cedula, setRefPersonal1Cedula] = useState("")
  const [refPersonal1Telefono, setRefPersonal1Telefono] = useState("")
  const [refPersonal2Nombre, setRefPersonal2Nombre] = useState("")
  const [refPersonal2Cedula, setRefPersonal2Cedula] = useState("")
  const [refPersonal2Telefono, setRefPersonal2Telefono] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: string } | null) => setRole((data?.role as typeof role) ?? "inquilino"))
      .catch(() => setRole("inquilino"))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const numVehiculos = Number(vehiculosCantidad.replace(/\D/g, "") || 0)
    if (numVehiculos > 0 && !vehiculosPlacas.trim()) {
      setError("Si indica vehículos, debe escribir las placas.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/arrendatarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adultos_habitantes: adultosHabitantes ? Number(adultosHabitantes.replace(/\D/g, "")) : null,
          ninos_habitantes: ninosHabitantes ? Number(ninosHabitantes.replace(/\D/g, "")) : null,
          mascotas_cantidad: mascotasCantidad ? Number(mascotasCantidad.replace(/\D/g, "")) : null,
          vehiculos_cantidad: vehiculosCantidad ? Number(vehiculosCantidad.replace(/\D/g, "")) : null,
          vehiculos_placas: vehiculosPlacas.trim() || null,
          autorizacion_datos: autorizacionDatos,
          nombre,
          cedula: cedula.replace(/\D/g, ""),
          telefono,
          coarrendatario_nombre: coarrendatarioNombre,
          coarrendatario_cedula: coarrendatarioCedula.replace(/\D/g, ""),
          coarrendatario_telefono: coarrendatarioTelefono,
          salario_principal: salarioPrincipal ? Number(salarioPrincipal.replace(/\D/g, "")) : null,
          salario_secundario: salarioSecundario ? Number(salarioSecundario.replace(/\D/g, "")) : null,
          empresa_principal: empresaPrincipal || null,
          empresa_secundaria: empresaSecundaria || null,
          tiempo_servicio_principal_meses: tiempoServicioPrincipalMeses ? Number(tiempoServicioPrincipalMeses.replace(/\D/g, "")) : null,
          tiempo_servicio_secundario_meses: tiempoServicioSecundarioMeses ? Number(tiempoServicioSecundarioMeses.replace(/\D/g, "")) : null,
          ref_familiar_1_nombre: refFamiliar1Nombre || null,
          ref_familiar_1_parentesco: refFamiliar1Parentesco || null,
          ref_familiar_1_cedula: refFamiliar1Cedula.replace(/\D/g, "") || null,
          ref_familiar_1_telefono: refFamiliar1Telefono || null,
          ref_familiar_2_nombre: refFamiliar2Nombre || null,
          ref_familiar_2_parentesco: refFamiliar2Parentesco || null,
          ref_familiar_2_cedula: refFamiliar2Cedula.replace(/\D/g, "") || null,
          ref_familiar_2_telefono: refFamiliar2Telefono || null,
          ref_personal_1_nombre: refPersonal1Nombre || null,
          ref_personal_1_cedula: refPersonal1Cedula.replace(/\D/g, "") || null,
          ref_personal_1_telefono: refPersonal1Telefono || null,
          ref_personal_2_nombre: refPersonal2Nombre || null,
          ref_personal_2_cedula: refPersonal2Cedula.replace(/\D/g, "") || null,
          ref_personal_2_telefono: refPersonal2Telefono || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "No se pudo guardar. Intenta de nuevo."
        )
      }

      setSuccess(true)
      setAdultosHabitantes("")
      setNinosHabitantes("")
      setMascotasCantidad("")
      setVehiculosCantidad("")
      setVehiculosPlacas("")
      setAutorizacionDatos(false)
      setNombre("")
      setCedula("")
      setTelefono("")
      setCoarrendatarioNombre("")
      setCoarrendatarioCedula("")
      setCoarrendatarioTelefono("")
      setSalarioPrincipal("")
      setSalarioSecundario("")
      setTiempoServicioPrincipalMeses("")
      setTiempoServicioSecundarioMeses("")
      setEmpresaPrincipal("")
      setEmpresaSecundaria("")
      setRefFamiliar1Nombre("")
      setRefFamiliar1Parentesco("")
      setRefFamiliar1Cedula("")
      setRefFamiliar1Telefono("")
      setRefFamiliar2Nombre("")
      setRefFamiliar2Parentesco("")
      setRefFamiliar2Cedula("")
      setRefFamiliar2Telefono("")
      setRefPersonal1Nombre("")
      setRefPersonal1Cedula("")
      setRefPersonal1Telefono("")
      setRefPersonal2Nombre("")
      setRefPersonal2Cedula("")
      setRefPersonal2Telefono("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const isInquilino = role === "inquilino"
  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">
        {isInquilino ? "Mis datos" : "Nuevo Arrendatario"}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            {/* Datos personales: nombre; cedula | telefono; habitantes (adultos, niños, mascotas, vehículos); placas */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isInquilino ? "Datos personales" : "Datos del arrendatario principal"}
                </CardTitle>
                <CardDescription>
                  Teléfono celular: 10 dígitos. Si hay vehículos, indique cantidad y placas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="nombre" className="mb-1 block text-sm font-medium">
                    Nombre completo (mín. 10 caracteres)
                  </label>
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Ej: Juan Pérez García"
                    minLength={10}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={cn(nombre.length >= 10 && inputFilledClass)}
                    required
                  />
                </div>
                <div className={inputRow}>
                  <div>
                    <label htmlFor="cedula" className="mb-1 block text-sm font-medium">
                      Cédula
                    </label>
                    <Input
                      id="cedula"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 1.234.567.890"
                      value={formatCedula(cedula)}
                      onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
                      className={cn(cedula.length > 0 && inputFilledClass)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="telefono" className="mb-1 block text-sm font-medium">
                      Teléfono celular
                    </label>
                    <Input
                      id="telefono"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(300) 123-4567"
                      value={formatTelefono(telefono)}
                      onChange={(e) => setTelefono(soloDigitosMax10(e.target.value))}
                      maxLength={14}
                      className={cn(telefono.length === 10 && inputFilledClass)}
                      required
                    />
                  </div>
                </div>

                <p className="text-xs font-medium text-muted-foreground">
                  Personas que habitarán el inmueble
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label htmlFor="adultos-habitantes" className="mb-1 block text-sm font-medium">
                      Adultos <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="adultos-habitantes"
                      type="text"
                      inputMode="numeric"
                      placeholder="Cantidad"
                      value={adultosHabitantes}
                      onChange={(e) => setAdultosHabitantes(e.target.value.replace(/\D/g, ""))}
                      className={cn(adultosHabitantes.length > 0 && inputFilledClass)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ninos-habitantes" className="mb-1 block text-sm font-medium">
                      Niños
                    </label>
                    <Input
                      id="ninos-habitantes"
                      type="text"
                      inputMode="numeric"
                      placeholder="Cantidad"
                      value={ninosHabitantes}
                      onChange={(e) => setNinosHabitantes(e.target.value.replace(/\D/g, ""))}
                      className={cn(ninosHabitantes.length > 0 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="mascotas-cantidad" className="mb-1 block text-sm font-medium">
                      Mascotas
                    </label>
                    <Input
                      id="mascotas-cantidad"
                      type="text"
                      inputMode="numeric"
                      placeholder="Cantidad"
                      value={mascotasCantidad}
                      onChange={(e) => setMascotasCantidad(e.target.value.replace(/\D/g, ""))}
                      className={cn(mascotasCantidad.length > 0 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="vehiculos-cantidad" className="mb-1 block text-sm font-medium">
                      Vehículos
                    </label>
                    <Input
                      id="vehiculos-cantidad"
                      type="text"
                      inputMode="numeric"
                      placeholder="Cantidad"
                      value={vehiculosCantidad}
                      onChange={(e) => setVehiculosCantidad(e.target.value.replace(/\D/g, ""))}
                      className={cn(vehiculosCantidad.length > 0 && inputFilledClass)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="vehiculos-placas" className="mb-1 block text-sm font-medium">
                    Placas de los vehículos
                    {Number(vehiculosCantidad.replace(/\D/g, "") || 0) > 0 && (
                      <span className="text-destructive"> *</span>
                    )}
                  </label>
                  <Input
                    id="vehiculos-placas"
                    type="text"
                    placeholder="Ej: ABC-123, XYZ-456 (obligatorio si hay vehículos)"
                    value={vehiculosPlacas}
                    onChange={(e) => setVehiculosPlacas(e.target.value)}
                    className={cn(vehiculosPlacas.length > 0 && inputFilledClass)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coarrendatario: nombre full; cedula | telefono */}
            <Card>
              <CardHeader>
                <CardTitle>Coarrendatario</CardTitle>
                <CardDescription>
                  Debe ser otra persona: cédula y teléfono distintos al titular. Teléfono: 10 dígitos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="coarrendatario-nombre" className="mb-1 block text-sm font-medium">
                    Nombre completo del coarrendatario (mín. 10 caracteres)
                  </label>
                  <Input
                    id="coarrendatario-nombre"
                    type="text"
                    placeholder="Ej: María García López"
                    minLength={10}
                    value={coarrendatarioNombre}
                    onChange={(e) => setCoarrendatarioNombre(e.target.value)}
                    className={cn(coarrendatarioNombre.length >= 10 && inputFilledClass)}
                    required
                  />
                </div>
                <div className={inputRow}>
                  <div>
                    <label htmlFor="coarrendatario-cedula" className="mb-1 block text-sm font-medium">
                      Cédula
                    </label>
                    <Input
                      id="coarrendatario-cedula"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 1.234.567.890"
                      value={formatCedula(coarrendatarioCedula)}
                      onChange={(e) => setCoarrendatarioCedula(e.target.value.replace(/\D/g, ""))}
                      className={cn(coarrendatarioCedula.length > 0 && inputFilledClass)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="coarrendatario-telefono" className="mb-1 block text-sm font-medium">
                      Teléfono celular
                    </label>
                    <Input
                      id="coarrendatario-telefono"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(310) 987-6543"
                      value={formatTelefono(coarrendatarioTelefono)}
                      onChange={(e) => setCoarrendatarioTelefono(soloDigitosMax10(e.target.value))}
                      maxLength={14}
                      className={cn(coarrendatarioTelefono.length === 10 && inputFilledClass)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salarios y trabajo: salario | tiempo meses; empresa */}
            <Card>
              <CardHeader>
                <CardTitle>Salarios y trabajo</CardTitle>
                <CardDescription>
                  Salario y antigüedad en meses. Empresa donde trabaja.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={inputRow}>
                  <div>
                    <label htmlFor="salario-principal" className="mb-1 block text-sm font-medium">
                      Salario del titular
                    </label>
                    <Input
                      id="salario-principal"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 2.500.000"
                      value={formatMoneda(salarioPrincipal)}
                      onChange={(e) => setSalarioPrincipal(e.target.value.replace(/\D/g, ""))}
                      className={cn(salarioPrincipal.length > 0 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="tiempo-meses-principal" className="mb-1 block text-sm font-medium">
                      Antigüedad (meses)
                    </label>
                    <Input
                      id="tiempo-meses-principal"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 24"
                      value={tiempoServicioPrincipalMeses}
                      onChange={(e) => setTiempoServicioPrincipalMeses(e.target.value.replace(/\D/g, ""))}
                      className={cn(tiempoServicioPrincipalMeses.length > 0 && inputFilledClass)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="empresa-principal" className="mb-1 block text-sm font-medium">
                    Empresa donde trabaja (titular)
                  </label>
                  <Input
                    id="empresa-principal"
                    type="text"
                    placeholder="Nombre de la empresa"
                    value={empresaPrincipal}
                    onChange={(e) => setEmpresaPrincipal(e.target.value)}
                    className={cn(empresaPrincipal.length > 0 && inputFilledClass)}
                  />
                </div>
                <div className={inputRow}>
                  <div>
                    <label htmlFor="salario-secundario" className="mb-1 block text-sm font-medium">
                      Salario del coarrendatario
                    </label>
                    <Input
                      id="salario-secundario"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 2.000.000"
                      value={formatMoneda(salarioSecundario)}
                      onChange={(e) => setSalarioSecundario(e.target.value.replace(/\D/g, ""))}
                      className={cn(salarioSecundario.length > 0 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="tiempo-meses-secundario" className="mb-1 block text-sm font-medium">
                      Antigüedad (meses)
                    </label>
                    <Input
                      id="tiempo-meses-secundario"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 12"
                      value={tiempoServicioSecundarioMeses}
                      onChange={(e) => setTiempoServicioSecundarioMeses(e.target.value.replace(/\D/g, ""))}
                      className={cn(tiempoServicioSecundarioMeses.length > 0 && inputFilledClass)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="empresa-secundaria" className="mb-1 block text-sm font-medium">
                    Empresa donde trabaja (coarrendatario)
                  </label>
                  <Input
                    id="empresa-secundaria"
                    type="text"
                    placeholder="Nombre de la empresa"
                    value={empresaSecundaria}
                    onChange={(e) => setEmpresaSecundaria(e.target.value)}
                    className={cn(empresaSecundaria.length > 0 && inputFilledClass)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Referencias familiares: nombre | parentesco (dropdown); cedula | telefono */}
            <Card>
              <CardHeader>
                <CardTitle>Referencias familiares</CardTitle>
                <CardDescription>
                  Nombre, parentesco, cédula y teléfono (10 dígitos). Todas las cédulas y teléfonos deben ser diferentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground">Referencia familiar 1</p>
                <div className={inputRow}>
                  <div>
                    <label htmlFor="ref-familiar-1-nombre" className="mb-1 block text-sm font-medium">
                      Nombre completo (mín. 10 caracteres)
                    </label>
                    <Input
                      id="ref-familiar-1-nombre"
                      type="text"
                      placeholder="Nombre completo"
                      minLength={10}
                      value={refFamiliar1Nombre}
                      onChange={(e) => setRefFamiliar1Nombre(e.target.value)}
                      className={cn(refFamiliar1Nombre.length >= 10 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="ref-familiar-1-parentesco" className="mb-1 block text-sm font-medium">
                      Parentesco
                    </label>
                    <select
                      id="ref-familiar-1-parentesco"
                      className={cn(selectClass, refFamiliar1Parentesco && inputFilledClass)}
                      value={refFamiliar1Parentesco}
                      onChange={(e) => setRefFamiliar1Parentesco(e.target.value)}
                    >
                      <option value="">Seleccione</option>
                      {PARENTESCOS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={inputRow}>
                  <div>
                    <label htmlFor="ref-familiar-1-cedula" className="mb-1 block text-sm font-medium">
                      Cédula
                    </label>
                    <Input
                      id="ref-familiar-1-cedula"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 1.234.567.890"
                      value={formatCedula(refFamiliar1Cedula)}
                      onChange={(e) => setRefFamiliar1Cedula(e.target.value.replace(/\D/g, ""))}
                      className={cn(refFamiliar1Cedula.length > 0 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="ref-familiar-1-telefono" className="mb-1 block text-sm font-medium">
                      Teléfono celular
                    </label>
                    <Input
                      id="ref-familiar-1-telefono"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(315) 123-4567"
                      value={formatTelefono(refFamiliar1Telefono)}
                      onChange={(e) => setRefFamiliar1Telefono(soloDigitosMax10(e.target.value))}
                      maxLength={14}
                      className={cn(refFamiliar1Telefono.length === 10 && inputFilledClass)}
                    />
                  </div>
                </div>

                <p className="text-xs font-medium text-muted-foreground pt-2">Referencia familiar 2</p>
                <div className={inputRow}>
                  <div>
                    <label htmlFor="ref-familiar-2-nombre" className="mb-1 block text-sm font-medium">
                      Nombre completo (mín. 10 caracteres)
                    </label>
                    <Input
                      id="ref-familiar-2-nombre"
                      type="text"
                      placeholder="Nombre completo"
                      minLength={10}
                      value={refFamiliar2Nombre}
                      onChange={(e) => setRefFamiliar2Nombre(e.target.value)}
                      className={cn(refFamiliar2Nombre.length >= 10 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="ref-familiar-2-parentesco" className="mb-1 block text-sm font-medium">
                      Parentesco
                    </label>
                    <select
                      id="ref-familiar-2-parentesco"
                      className={cn(selectClass, refFamiliar2Parentesco && inputFilledClass)}
                      value={refFamiliar2Parentesco}
                      onChange={(e) => setRefFamiliar2Parentesco(e.target.value)}
                    >
                      <option value="">Seleccione</option>
                      {PARENTESCOS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={inputRow}>
                  <div>
                    <label htmlFor="ref-familiar-2-cedula" className="mb-1 block text-sm font-medium">
                      Cédula
                    </label>
                    <Input
                      id="ref-familiar-2-cedula"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 1.234.567.890"
                      value={formatCedula(refFamiliar2Cedula)}
                      onChange={(e) => setRefFamiliar2Cedula(e.target.value.replace(/\D/g, ""))}
                      className={cn(refFamiliar2Cedula.length > 0 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="ref-familiar-2-telefono" className="mb-1 block text-sm font-medium">
                      Teléfono celular
                    </label>
                    <Input
                      id="ref-familiar-2-telefono"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(320) 987-6543"
                      value={formatTelefono(refFamiliar2Telefono)}
                      onChange={(e) => setRefFamiliar2Telefono(soloDigitosMax10(e.target.value))}
                      maxLength={14}
                      className={cn(refFamiliar2Telefono.length === 10 && inputFilledClass)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referencias personales: nombre full; cedula | telefono */}
            <Card>
              <CardHeader>
                <CardTitle>Referencias personales</CardTitle>
                <CardDescription>
                  Nombre (mín. 10 caracteres), cédula y teléfono. Todas las cédulas y teléfonos deben ser diferentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground">Referencia personal 1</p>
                <div>
                  <label htmlFor="ref-personal-1-nombre" className="mb-1 block text-sm font-medium">
                    Nombre completo (mín. 10 caracteres)
                  </label>
                  <Input
                    id="ref-personal-1-nombre"
                    type="text"
                    placeholder="Nombre completo"
                    minLength={10}
                    value={refPersonal1Nombre}
                    onChange={(e) => setRefPersonal1Nombre(e.target.value)}
                    className={cn(refPersonal1Nombre.length >= 10 && inputFilledClass)}
                  />
                </div>
                <div className={inputRow}>
                  <div>
                    <label htmlFor="ref-personal-1-cedula" className="mb-1 block text-sm font-medium">
                      Cédula
                    </label>
                    <Input
                      id="ref-personal-1-cedula"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 1.234.567.890"
                      value={formatCedula(refPersonal1Cedula)}
                      onChange={(e) => setRefPersonal1Cedula(e.target.value.replace(/\D/g, ""))}
                      className={cn(refPersonal1Cedula.length > 0 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="ref-personal-1-telefono" className="mb-1 block text-sm font-medium">
                      Teléfono celular
                    </label>
                    <Input
                      id="ref-personal-1-telefono"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(315) 123-4567"
                      value={formatTelefono(refPersonal1Telefono)}
                      onChange={(e) => setRefPersonal1Telefono(soloDigitosMax10(e.target.value))}
                      maxLength={14}
                      className={cn(refPersonal1Telefono.length === 10 && inputFilledClass)}
                    />
                  </div>
                </div>

                <p className="text-xs font-medium text-muted-foreground pt-2">Referencia personal 2</p>
                <div>
                  <label htmlFor="ref-personal-2-nombre" className="mb-1 block text-sm font-medium">
                    Nombre completo (mín. 10 caracteres)
                  </label>
                  <Input
                    id="ref-personal-2-nombre"
                    type="text"
                    placeholder="Nombre completo"
                    minLength={10}
                    value={refPersonal2Nombre}
                    onChange={(e) => setRefPersonal2Nombre(e.target.value)}
                    className={cn(refPersonal2Nombre.length >= 10 && inputFilledClass)}
                  />
                </div>
                <div className={inputRow}>
                  <div>
                    <label htmlFor="ref-personal-2-cedula" className="mb-1 block text-sm font-medium">
                      Cédula
                    </label>
                    <Input
                      id="ref-personal-2-cedula"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 1.234.567.890"
                      value={formatCedula(refPersonal2Cedula)}
                      onChange={(e) => setRefPersonal2Cedula(e.target.value.replace(/\D/g, ""))}
                      className={cn(refPersonal2Cedula.length > 0 && inputFilledClass)}
                    />
                  </div>
                  <div>
                    <label htmlFor="ref-personal-2-telefono" className="mb-1 block text-sm font-medium">
                      Teléfono celular
                    </label>
                    <Input
                      id="ref-personal-2-telefono"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(320) 987-6543"
                      value={formatTelefono(refPersonal2Telefono)}
                      onChange={(e) => setRefPersonal2Telefono(soloDigitosMax10(e.target.value))}
                      maxLength={14}
                      className={cn(refPersonal2Telefono.length === 10 && inputFilledClass)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={autorizacionDatos}
                onChange={(e) => setAutorizacionDatos(e.target.checked)}
                required
                className="mt-1 h-4 w-4 rounded border-gray-300"
                aria-describedby="politica-datos-desc"
              />
              <span id="politica-datos-desc" className="text-sm text-gray-700 dark:text-gray-300">
                Autorizo el manejo de mis datos personales de acuerdo con la política de tratamiento
                de datos. He leído y acepto los términos.
              </span>
            </label>
            <p className="mt-2">
              <a
                href="/politica-datos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary underline hover:no-underline"
              >
                Ver política de datos
              </a>
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-medium text-green-600">
              {isInquilino ? "Datos guardados correctamente." : "Arrendatario registrado correctamente."}
            </p>
          )}
          <CardFooter className="flex gap-3 p-0">
            <Button type="submit" disabled={loading || !autorizacionDatos}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
            <Button variant="outline" asChild>
              <Link href={isInquilino ? "/nuevo" : "/dashboard"}>Volver</Link>
            </Button>
          </CardFooter>
        </div>
      </form>
    </div>
  )
}
