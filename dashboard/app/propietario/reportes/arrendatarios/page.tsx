"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, Trash2, Eye, ChevronDown, ChevronUp, Loader2 } from "lucide-react"

type InquilinoActivo = {
  id: string | null
  arrendatarioId: string
  nombre: string
  cedula: string
  email: string | null
  celular: string | null
  tieneUsuario: boolean
  tieneContratoActivo: boolean
  contratoId: string
  contratoEstado: string
  propiedad: { direccion: string; ciudad: string } | null
  propietario: { nombre: string; email: string } | null
}

type InquilinoInactivo = {
  id: string
  nombre: string
  cedula: string
  email: string | null
  celular: string | null
  tieneUsuario: boolean
  tieneContrato: boolean
  estadoContrato: string | null
}

type Tab = "activos" | "inactivos"

export default function ArrendatariosPage() {
  const [tab, setTab] = useState<Tab>("activos")
  const [activos, setActivos] = useState<InquilinoActivo[]>([])
  const [inactivos, setInactivos] = useState<InquilinoInactivo[]>([])
  const [loadingActivos, setLoadingActivos] = useState(true)
  const [loadingInactivos, setLoadingInactivos] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchActivos()
  }, [])

  useEffect(() => {
    if (tab === "inactivos" && inactivos.length === 0 && !loadingInactivos) {
      fetchInactivos()
    }
  }, [tab])

  async function fetchActivos() {
    setLoadingActivos(true)
    try {
      const res = await fetch("/api/reportes/inquilinos-activos")
      if (res.ok) {
        const data = await res.json()
        setActivos(data)
      }
    } finally {
      setLoadingActivos(false)
    }
  }

  async function fetchInactivos() {
    setLoadingInactivos(true)
    try {
      const res = await fetch("/api/reportes/inquilinos-inactivos")
      if (res.ok) {
        const data = await res.json()
        setInactivos(data)
      }
    } finally {
      setLoadingInactivos(false)
    }
  }

  async function handleDelete(arrendatarioId: string, nombre: string) {
    if (!confirm(`¿Estás seguro de que deseas eliminar a "${nombre}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(arrendatarioId)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(`/api/admin/arrendatarios/${arrendatarioId}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        setSuccessMsg(`Arrendatario "${nombre}" eliminado correctamente.`)
        setActivos((prev) => prev.filter((a) => a.arrendatarioId !== arrendatarioId))
        setInactivos((prev) => prev.filter((a) => a.id !== arrendatarioId))
      } else {
        setErrorMsg(data.error || "Error al eliminar el arrendatario")
      }
    } catch {
      setErrorMsg("Error de conexión al intentar eliminar")
    } finally {
      setDeletingId(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/propietario/reportes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Arrendatarios</h1>
          <p className="text-muted-foreground">
            Consulta, edita y gestiona tus arrendatarios
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          {successMsg}
        </div>
      )}

      {/* Pestañas */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("activos")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
            tab === "activos"
              ? "border-green-600 text-green-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Activos
          {!loadingActivos && (
            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
              {activos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("inactivos")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
            tab === "inactivos"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Inactivos / Sin contrato
          {!loadingInactivos && inactivos.length > 0 && (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
              {inactivos.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido pestaña Activos */}
      {tab === "activos" && (
        <>
          {loadingActivos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No tienes arrendatarios activos en este momento.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activos.map((a) => (
                <Card key={a.arrendatarioId} className="overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{a.nombre}</p>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 shrink-0">
                          {a.contratoEstado === "borrador" ? "En proceso" : "Activo"}
                        </span>
                        {a.tieneUsuario && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 shrink-0">
                            Con cuenta
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        CC: {a.cedula} &nbsp;•&nbsp; {a.celular || a.email || "Sin contacto"}
                      </p>
                      {a.propiedad && (
                        <p className="text-xs text-muted-foreground">
                          {a.propiedad.direccion}, {a.propiedad.ciudad}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(a.arrendatarioId)}
                        title="Ver detalles"
                      >
                        {expandedId === a.arrendatarioId ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Link href={`/propietario/reportes/arrendatarios/${a.arrendatarioId}/editar`}>
                        <Button variant="outline" size="sm" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(a.arrendatarioId, a.nombre)}
                        disabled={deletingId === a.arrendatarioId}
                        title="Eliminar"
                      >
                        {deletingId === a.arrendatarioId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {expandedId === a.arrendatarioId && (
                    <div className="border-t bg-gray-50 p-4">
                      <DetalleArrendatario id={a.arrendatarioId} />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Contenido pestaña Inactivos */}
      {tab === "inactivos" && (
        <>
          {loadingInactivos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : inactivos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay arrendatarios inactivos o sin contrato.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {inactivos.map((a) => (
                <Card key={a.id} className="overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{a.nombre}</p>
                        {a.tieneContrato ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 shrink-0">
                            {a.estadoContrato || "Inactivo"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 shrink-0">
                            Sin contrato
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        CC: {a.cedula} &nbsp;•&nbsp; {a.celular || a.email || "Sin contacto"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(a.id)}
                        title="Ver detalles"
                      >
                        {expandedId === a.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Link href={`/propietario/reportes/arrendatarios/${a.id}/editar`}>
                        <Button variant="outline" size="sm" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(a.id, a.nombre)}
                        disabled={deletingId === a.id}
                        title="Eliminar"
                      >
                        {deletingId === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {expandedId === a.id && (
                    <div className="border-t bg-gray-50 p-4">
                      <DetalleArrendatario id={a.id} />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

type ArrendatarioDetalle = {
  nombre: string
  cedula: string
  telefono: string | null
  email: string | null
  celular: string | null
  adultos_habitantes: number | null
  ninos_habitantes: number | null
  mascotas_cantidad: number | null
  vehiculos_cantidad: number | null
  vehiculos_placas: string | null
  coarrendatario_nombre: string | null
  coarrendatario_cedula: string | null
  coarrendatario_telefono: string | null
  coarrendatario_email: string | null
  salario_principal: number | null
  salario_secundario: number | null
  empresa_principal: string | null
  empresa_secundaria: string | null
  tiempo_servicio_principal_meses: number | null
  tiempo_servicio_secundario_meses: number | null
  ref_familiar_1_nombre: string | null
  ref_familiar_1_parentesco: string | null
  ref_familiar_1_cedula: string | null
  ref_familiar_1_telefono: string | null
  ref_familiar_2_nombre: string | null
  ref_familiar_2_parentesco: string | null
  ref_familiar_2_cedula: string | null
  ref_familiar_2_telefono: string | null
  ref_personal_1_nombre: string | null
  ref_personal_1_cedula: string | null
  ref_personal_1_telefono: string | null
  ref_personal_2_nombre: string | null
  ref_personal_2_cedula: string | null
  ref_personal_2_telefono: string | null
}

function DetalleArrendatario({ id }: { id: string }) {
  const [data, setData] = useState<ArrendatarioDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/arrendatarios/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError("Error al cargar los datos"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!data) return null

  const formatCurrency = (v: number | null) =>
    v != null
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v)
      : "—"

  const val = (v: string | number | null | undefined) => v ?? "—"

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
      <div>
        <CardTitle className="mb-3 text-base">Datos personales</CardTitle>
        <dl className="space-y-1">
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Nombre:</dt><dd className="font-medium">{val(data.nombre)}</dd></div>
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Cédula:</dt><dd>{val(data.cedula)}</dd></div>
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Teléfono:</dt><dd>{val(data.telefono)}</dd></div>
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Celular:</dt><dd>{val(data.celular)}</dd></div>
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Email:</dt><dd>{val(data.email)}</dd></div>
        </dl>
      </div>

      <div>
        <CardTitle className="mb-3 text-base">Grupo familiar</CardTitle>
        <dl className="space-y-1">
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Adultos:</dt><dd>{val(data.adultos_habitantes)}</dd></div>
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Niños:</dt><dd>{val(data.ninos_habitantes)}</dd></div>
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Mascotas:</dt><dd>{val(data.mascotas_cantidad)}</dd></div>
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Vehículos:</dt><dd>{val(data.vehiculos_cantidad)}</dd></div>
          {data.vehiculos_placas && (
            <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Placas:</dt><dd>{data.vehiculos_placas}</dd></div>
          )}
        </dl>
      </div>

      {(data.coarrendatario_nombre || data.coarrendatario_cedula) && (
        <div>
          <CardTitle className="mb-3 text-base">Coarrendatario</CardTitle>
          <dl className="space-y-1">
            <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Nombre:</dt><dd>{val(data.coarrendatario_nombre)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Cédula:</dt><dd>{val(data.coarrendatario_cedula)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Teléfono:</dt><dd>{val(data.coarrendatario_telefono)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Email:</dt><dd>{val(data.coarrendatario_email)}</dd></div>
          </dl>
        </div>
      )}

      <div>
        <CardTitle className="mb-3 text-base">Información laboral</CardTitle>
        <dl className="space-y-1">
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Empresa:</dt><dd>{val(data.empresa_principal)}</dd></div>
          <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Salario:</dt><dd>{formatCurrency(data.salario_principal)}</dd></div>
          {data.empresa_secundaria && (
            <>
              <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Empresa 2:</dt><dd>{data.empresa_secundaria}</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Salario 2:</dt><dd>{formatCurrency(data.salario_secundario)}</dd></div>
            </>
          )}
        </dl>
      </div>

      {(data.ref_familiar_1_nombre || data.ref_familiar_2_nombre) && (
        <div className="md:col-span-2">
          <CardTitle className="mb-3 text-base">Referencias familiares</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.ref_familiar_1_nombre && (
              <dl className="space-y-1">
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Nombre:</dt><dd>{data.ref_familiar_1_nombre}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Parentesco:</dt><dd>{val(data.ref_familiar_1_parentesco)}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Cédula:</dt><dd>{val(data.ref_familiar_1_cedula)}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Teléfono:</dt><dd>{val(data.ref_familiar_1_telefono)}</dd></div>
              </dl>
            )}
            {data.ref_familiar_2_nombre && (
              <dl className="space-y-1">
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Nombre:</dt><dd>{data.ref_familiar_2_nombre}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Parentesco:</dt><dd>{val(data.ref_familiar_2_parentesco)}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Cédula:</dt><dd>{val(data.ref_familiar_2_cedula)}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Teléfono:</dt><dd>{val(data.ref_familiar_2_telefono)}</dd></div>
              </dl>
            )}
          </div>
        </div>
      )}

      {(data.ref_personal_1_nombre || data.ref_personal_2_nombre) && (
        <div className="md:col-span-2">
          <CardTitle className="mb-3 text-base">Referencias personales</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.ref_personal_1_nombre && (
              <dl className="space-y-1">
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Nombre:</dt><dd>{data.ref_personal_1_nombre}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Cédula:</dt><dd>{val(data.ref_personal_1_cedula)}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Teléfono:</dt><dd>{val(data.ref_personal_1_telefono)}</dd></div>
              </dl>
            )}
            {data.ref_personal_2_nombre && (
              <dl className="space-y-1">
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Nombre:</dt><dd>{data.ref_personal_2_nombre}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Cédula:</dt><dd>{val(data.ref_personal_2_cedula)}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Teléfono:</dt><dd>{val(data.ref_personal_2_telefono)}</dd></div>
              </dl>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
