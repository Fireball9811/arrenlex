"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ContratoParaPago {
  contrato_id: string
  propiedad_id: string
  direccion: string
  canon_mensual: number
  propietario_nombre: string | null
  ultimo_periodo: string | null
}

interface InquilinoConPropiedades {
  arrendatario_id: string
  nombre: string
  contratos: ContratoParaPago[]
}

interface Pago {
  id: string
  inquilino: string
  propietario: string
  direccion: string
  monto: number
  periodo: string
  estado: string
  metodo: string
  referencia: string
  fecha_pago: string
  fecha_aprobacion: string
}

function siguientePeriodo(periodo: string | null): string {
  if (!periodo || periodo.length < 7) {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }
  const [y, m] = periodo.split("-").map(Number)
  const next = new Date(y, m, 1)
  const ny = next.getFullYear()
  const nm = next.getMonth() + 1
  return `${ny}-${String(nm).padStart(2, "0")}`
}

function periodoToMonthInput(periodo: string): string {
  if (!periodo || periodo.length < 7) return ""
  const [y, m] = periodo.split("-")
  return `${y}-${m}`
}

type UserRole = "admin" | "propietario" | "inquilino"

export default function GestionPagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [inquilinos, setInquilinos] = useState<InquilinoConPropiedades[]>([])
  const [loadingInquilinos, setLoadingInquilinos] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState<UserRole | null>(null)

  const isAdmin = role === "admin"
  const isPropietario = role === "propietario"
  const puedeRegistrarPagos = isPropietario

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { role?: UserRole } | null) => setRole((data?.role as UserRole) ?? null))
      .catch(() => setRole(null))
  }, [])

  const fetchPagos = useCallback(async () => {
    const res = await fetch("/api/pagos")
    if (!res.ok) return
    const data = await res.json()
    setPagos(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    fetchPagos().finally(() => setLoading(false))
  }, [fetchPagos])

  useEffect(() => {
    if (!mostrarFormulario) return
    setLoadingInquilinos(true)
    setSubmitError(null)
    fetch("/api/reportes/inquilinos-con-propiedades")
      .then((r) => r.json())
      .then((data) => setInquilinos(Array.isArray(data) ? data : []))
      .catch(() => setInquilinos([]))
      .finally(() => setLoadingInquilinos(false))
  }, [mostrarFormulario])

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  const estadoClass = (estado: string) => {
    switch (estado) {
      case "Completado":
        return "bg-green-100 text-green-800"
      case "Pendiente":
        return "bg-amber-100 text-amber-800"
      case "Rechazado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Gestión de Pagos</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Ver todos los pagos del sistema (solo consulta). Solo los propietarios pueden registrar pagos."
            : "Ver todos los pagos del sistema y registrar nuevos"}
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Pagos</p>
            <p className="text-2xl font-bold">{pagos.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Completados</p>
            <p className="text-2xl font-bold text-green-600">
              {formatPeso(
                pagos.filter((p) => p.estado === "Completado").reduce((a, b) => a + b.monto, 0)
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatPeso(
                pagos.filter((p) => p.estado === "Pendiente").reduce((a, b) => a + b.monto, 0)
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Rechazados</p>
            <p className="text-2xl font-bold text-red-600">
              {formatPeso(
                pagos.filter((p) => p.estado === "Rechazado").reduce((a, b) => a + b.monto, 0)
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex gap-4">
        {puedeRegistrarPagos && (
          <Button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            variant={mostrarFormulario ? "outline" : "default"}
          >
            {mostrarFormulario ? "Cancelar" : "Registrar Nuevo Pago"}
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/reportes/financiero">Ver Reporte Financiero</Link>
        </Button>
      </div>

      {isAdmin && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-amber-800">
              Como administrador, tu rol no te permite registrar pagos. Solo los propietarios pueden registrar pagos de sus propiedades.
            </p>
          </CardContent>
        </Card>
      )}

      {mostrarFormulario && puedeRegistrarPagos && (
        <FormRegistroPago
          inquilinos={inquilinos}
          loadingInquilinos={loadingInquilinos}
          submitError={submitError}
          submitting={submitting}
          setSubmitError={setSubmitError}
          setSubmitting={setSubmitting}
          onSuccess={() => {
            setMostrarFormulario(false)
            fetchPagos()
          }}
          onCancel={() => setMostrarFormulario(false)}
          siguientePeriodo={siguientePeriodo}
          periodoToMonthInput={periodoToMonthInput}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Todos los Pagos del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando pagos...</p>
          ) : pagos.length === 0 ? (
            <p className="text-muted-foreground">No hay pagos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Inquilino</th>
                    <th className="p-3 text-left">Propietario</th>
                    <th className="p-3 text-left">Dirección</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3 text-center">Periodo</th>
                    <th className="p-3 text-center">Método</th>
                    <th className="p-3 text-left">Referencia</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-left">Fecha Pago</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="border-b">
                      <td className="p-3">{pago.inquilino}</td>
                      <td className="p-3">{pago.propietario}</td>
                      <td className="p-3 text-xs">{pago.direccion}</td>
                      <td className="p-3 text-right font-semibold">
                        {formatPeso(pago.monto)}
                      </td>
                      <td className="p-3 text-center">{pago.periodo}</td>
                      <td className="p-3 text-center">{pago.metodo}</td>
                      <td className="p-3">
                        <code className="rounded bg-gray-100 px-1 text-xs">
                          {pago.referencia}
                        </code>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${estadoClass(pago.estado)}`}
                        >
                          {pago.estado}
                        </span>
                      </td>
                      <td className="p-3 text-xs">{pago.fecha_pago}</td>
                      <td className="p-3 text-center">
                        {pago.estado === "Pendiente" && (
                          <>
                            <Button size="sm" variant="outline">
                              Aprobar
                            </Button>
                            <Button size="sm" variant="destructive" className="ml-2">
                              Rechazar
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface FormRegistroPagoProps {
  inquilinos: InquilinoConPropiedades[]
  loadingInquilinos: boolean
  submitError: string | null
  submitting: boolean
  setSubmitError: (s: string | null) => void
  setSubmitting: (b: boolean) => void
  onSuccess: () => void
  onCancel: () => void
  siguientePeriodo: (p: string | null) => string
  periodoToMonthInput: (p: string) => string
}

function FormRegistroPago({
  inquilinos,
  loadingInquilinos,
  submitError,
  submitting,
  setSubmitError,
  setSubmitting,
  onSuccess,
  onCancel,
  siguientePeriodo,
  periodoToMonthInput,
}: FormRegistroPagoProps) {
  const inquilinoPrincipal = inquilinos[0]
  const [arrendatarioId, setArrendatarioId] = useState<string>("")
  const [contratoId, setContratoId] = useState<string>("")
  const [monto, setMonto] = useState<string>("")
  const [periodo, setPeriodo] = useState<string>("")
  const [metodoPago, setMetodoPago] = useState<string>("Transferencia")
  const [referenciaBancaria, setReferenciaBancaria] = useState<string>("")

  const inquilinoSeleccionado = inquilinos.find((i) => i.arrendatario_id === arrendatarioId) ?? inquilinoPrincipal
  const contratos = inquilinoSeleccionado?.contratos ?? []
  const contratoSeleccionado = contratos.find((c) => c.contrato_id === contratoId)

  useEffect(() => {
    if (inquilinoPrincipal && !arrendatarioId) {
      setArrendatarioId(inquilinoPrincipal.arrendatario_id)
    }
  }, [inquilinoPrincipal, arrendatarioId])

  useEffect(() => {
    if (!arrendatarioId) return
    const inv = inquilinos.find((i) => i.arrendatario_id === arrendatarioId)
    const firstContrato = inv?.contratos?.[0]
    if (firstContrato && contratoId !== firstContrato.contrato_id) {
      setContratoId(firstContrato.contrato_id)
      setMonto(String(firstContrato.canon_mensual))
      const sig = siguientePeriodo(firstContrato.ultimo_periodo)
      setPeriodo(periodoToMonthInput(sig))
    }
  }, [arrendatarioId, inquilinos])

  useEffect(() => {
    if (!contratoId || !contratoSeleccionado) return
    setMonto(String(contratoSeleccionado.canon_mensual))
    const sig = siguientePeriodo(contratoSeleccionado.ultimo_periodo)
    setPeriodo(periodoToMonthInput(sig))
  }, [contratoId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!contratoId || !monto || !periodo || !metodoPago) {
      setSubmitError("Completa contrato, monto, periodo y método de pago.")
      return
    }
    const periodoStr = periodo.length === 7 ? periodo : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
    setSubmitting(true)
    try {
      const res = await fetch("/api/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato_id: contratoId,
          monto: Number(monto),
          periodo: periodoStr,
          metodo_pago: metodoPago,
          referencia_bancaria: referenciaBancaria.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data?.error ?? "Error al registrar el pago")
        return
      }
      onSuccess()
    } catch {
      setSubmitError("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInquilinos) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Cargando inquilinos y propiedades...</p>
        </CardContent>
      </Card>
    )
  }

  if (inquilinos.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            No hay inquilinos con contratos activos. Crea contratos primero.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Registrar Nuevo Pago</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Inquilino *</label>
            <select
              className="w-full rounded border p-2"
              value={arrendatarioId}
              onChange={(e) => {
                setArrendatarioId(e.target.value)
                setContratoId("")
              }}
              required
            >
              {inquilinos.map((inv) => (
                <option key={inv.arrendatario_id} value={inv.arrendatario_id}>
                  {inv.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Propiedad *</label>
            <select
              className="w-full rounded border p-2"
              value={contratoId}
              onChange={(e) => setContratoId(e.target.value)}
              required
            >
              <option value="">Seleccionar propiedad...</option>
              {contratos.map((c) => (
                <option key={c.contrato_id} value={c.contrato_id}>
                  {c.direccion}
                </option>
              ))}
            </select>
          </div>

          {contratoSeleccionado && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Propietario</label>
                <input
                  type="text"
                  className="w-full rounded border bg-gray-50 p-2 read-only:opacity-90"
                  value={contratoSeleccionado.propietario_nombre ?? ""}
                  readOnly
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monto *</label>
                  <input
                    type="number"
                    className="w-full rounded border p-2"
                    placeholder="0"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    min={1}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Periodo *</label>
                  <input
                    type="month"
                    className="w-full rounded border p-2"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Método de Pago *</label>
                  <select
                    className="w-full rounded border p-2"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    required
                  >
                    <option value="PSE">PSE</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Referencia Bancaria</label>
                <input
                  type="text"
                  className="w-full rounded border p-2"
                  placeholder="Referencia completa (números y letras)"
                  value={referenciaBancaria}
                  onChange={(e) => setReferenciaBancaria(e.target.value)}
                />
              </div>
            </>
          )}

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !contratoSeleccionado}>
              {submitting ? "Registrando..." : "Registrar Pago"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
