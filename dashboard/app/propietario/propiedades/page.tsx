"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, MapPin, Home, Edit2, Trash2, Receipt, Link2, Copy, Check } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

interface Propiedad {
  id: string
  titulo: string
  direccion: string
  ciudad: string
  habitaciones: number
  banos: number
  area: number
  valor_arriendo: number
  estado: string
  descripcion?: string
  numero_matricula?: string
  ascensor?: number
  depositos?: number
  parqueaderos?: number
}

export default function PropietarioPropiedadesPage() {
  const router = useRouter()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [totalSinFiltro, setTotalSinFiltro] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [ciudadFiltro, setCiudadFiltro] = useState("")
  const [ciudades, setCiudades] = useState<string[]>([])
  const [generandoTokenId, setGenerandoTokenId] = useState<string | null>(null)
  const [enlaceGenerado, setEnlaceGenerado] = useState<Record<string, string>>({})
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  function buildUrl(ciudad: string, cursor?: string) {
    const params = new URLSearchParams()
    if (ciudad) params.set("ciudad", ciudad)
    if (cursor) params.set("cursor", cursor)
    return `/api/propiedades?${params.toString()}`
  }

  // Carga inicial — redirige según rol y trae primera página
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: string } | null) => {
        if (data?.role === "admin") { router.replace("/admin/dashboard"); return }
        if (data?.role === "inquilino") { router.replace("/inquilino/dashboard"); return }

        return fetch("/api/propiedades")
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
          })
          .then((data: { propiedades: Propiedad[]; nextCursor: string | null }) => {
            const lista = data.propiedades ?? []
            setPropiedades(lista)
            setNextCursor(data.nextCursor ?? null)
            setTotalSinFiltro(lista.length)
            const uniqueCities = [...new Set(lista.map((p) => p.ciudad).filter(Boolean))].sort()
            setCiudades(uniqueCities)
            setLoading(false)
          })
          .catch((err) => { setError(`Error: ${err.message}`); setLoading(false) })
      })
      .catch(() => { setError("Error de autenticación"); setLoading(false) })
  }, [router])

  // Cuando cambia el filtro de ciudad — recarga desde cero con filtro server-side
  useEffect(() => {
    if (loading) return
    setLoading(true)
    setPropiedades([])
    setNextCursor(null)
    fetch(buildUrl(ciudadFiltro))
      .then((res) => res.json())
      .then((data: { propiedades: Propiedad[]; nextCursor: string | null }) => {
        setPropiedades(data.propiedades ?? [])
        setNextCursor(data.nextCursor ?? null)
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudadFiltro])

  async function cargarMas() {
    if (!nextCursor) return
    setCargandoMas(true)
    try {
      const res = await fetch(buildUrl(ciudadFiltro, nextCursor))
      const data: { propiedades: Propiedad[]; nextCursor: string | null } = await res.json()
      setPropiedades((prev) => [...prev, ...(data.propiedades ?? [])])
      setNextCursor(data.nextCursor ?? null)
    } finally {
      setCargandoMas(false)
    }
  }

  const propiedadesFiltradas = propiedades

  async function handleGenerarEnlace(propiedadId: string) {
    setGenerandoTokenId(propiedadId)
    try {
      const res = await fetch("/api/intake/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedad_id: propiedadId }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? "Error al generar el enlace"); return }
      setEnlaceGenerado((prev) => ({ ...prev, [propiedadId]: data.url }))
    } catch {
      alert("Error al generar el enlace de aplicación")
    } finally {
      setGenerandoTokenId(null)
    }
  }

  async function handleCopiarEnlace(propiedadId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiadoId(propiedadId)
      setTimeout(() => setCopiadoId((prev) => (prev === propiedadId ? null : prev)), 2000)
    } catch {
      alert("No se pudo copiar. Copia manualmente: " + url)
    }
  }

  if (loading) return <p className="text-muted-foreground">{t.comun.cargando}</p>

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600 font-semibold">{error}</p>
          <p className="text-red-500 text-sm mt-2">Si el problema persiste, contacta al administrador.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div suppressHydrationWarning>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Propiedades</h1>
        <Link href="/propietario/propiedades/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva propiedad
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtrar por ciudad</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="mb-2 block text-sm font-medium">Ciudad</label>
            <select
              value={ciudadFiltro}
              onChange={(e) => setCiudadFiltro(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Todas las ciudades</option>
              {ciudades.map((ciudad) => (
                <option key={ciudad} value={ciudad}>
                  {ciudad}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {propiedadesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            {propiedades.length === 0 ? (
              <>
                <p className="text-muted-foreground font-semibold">No tienes propiedades registradas</p>
                <p className="text-muted-foreground text-sm mt-1">Comienza registrando tu primera propiedad</p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground font-semibold">
                  {ciudadFiltro ? `No hay propiedades en ${ciudadFiltro}` : "No hay resultados"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {ciudadFiltro 
                    ? `Tienes ${propiedades.length} propiedad(es) pero ninguna en ${ciudadFiltro}` 
                    : "Prueba con otros filtros"}
                </p>
              </>
            )}
            <Link href="/propietario/propiedades/nuevo">
              <Button className="mt-4" variant="default">
                <Plus className="mr-2 h-4 w-4" />
                Nueva propiedad
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {ciudadFiltro ? (
                <span>Propiedades en <strong>{ciudadFiltro}</strong>: <strong className="text-green-600">{propiedadesFiltradas.length}</strong></span>
              ) : (
                <span>Propiedades cargadas: <strong className="text-green-600">{propiedades.length}</strong>{nextCursor ? " (hay más)" : ""}</span>
              )}
            </div>
            {ciudadFiltro && (
              <button
                onClick={() => setCiudadFiltro("")}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                ✕ Limpiar filtro de ciudad
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {propiedadesFiltradas.map((propiedad) => (
              <Card key={propiedad.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardDescription>
                      <div className="mt-1 flex items-start gap-1">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span>{propiedad.direccion || "Sin dirección"}, {propiedad.ciudad || "Sin ciudad"}</span>
                      </div>
                    </CardDescription>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`rounded px-2.5 py-0.5 text-xs font-semibold ${
                        propiedad.estado === "disponible"
                          ? "bg-green-100 text-green-800"
                          : propiedad.estado === "arrendado"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {propiedad.estado ?? "sin estado"}
                      </span>
                      {propiedad.numero_matricula && (
                        <div className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          <p className="text-xs text-blue-600 font-semibold">{propiedad.numero_matricula}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Habitaciones</p>
                        <p className="font-semibold">{propiedad.habitaciones || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Baños</p>
                        <p className="font-semibold">{propiedad.banos || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Área</p>
                        <p className="font-semibold">{propiedad.area || 0}m²</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Ascensores</p>
                        <p className="font-semibold">{propiedad.ascensor || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Depósitos</p>
                        <p className="font-semibold">{propiedad.depositos || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Parqueaderos</p>
                        <p className="font-semibold">{propiedad.parqueaderos || 0}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-muted-foreground text-sm">Canon mensual</p>
                      <p className="text-lg font-bold text-green-600">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        }).format(propiedad.valor_arriendo || 0)}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link href={`/propietario/propiedades/${propiedad.id}/recibos`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Receipt className="mr-2 h-4 w-4" />
                          Recibos
                        </Button>
                      </Link>
                      <Link href={`/propietario/propiedades/${propiedad.id}/editar`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit2 className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar propiedad?`)) {
                            // Implementar eliminación
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {propiedad.estado === "disponible" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-cyan-700 border-cyan-200 hover:bg-cyan-50 mt-2"
                          onClick={() => handleGenerarEnlace(propiedad.id)}
                          disabled={generandoTokenId === propiedad.id}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          {generandoTokenId === propiedad.id ? "Generando…" : "Generar enlace de aplicación"}
                        </Button>

                        {enlaceGenerado[propiedad.id] && (
                          <div className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 p-3 space-y-1.5">
                            <p className="text-xs font-medium text-cyan-800">
                              Enlace listo — válido 24 h, un solo uso
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-cyan-700 font-mono truncate flex-1 bg-white border border-cyan-100 rounded px-2 py-1">
                                {enlaceGenerado[propiedad.id]}
                              </p>
                              <button
                                onClick={() => handleCopiarEnlace(propiedad.id, enlaceGenerado[propiedad.id])}
                                className="shrink-0 text-cyan-600 hover:text-cyan-900 transition"
                                title="Copiar enlace"
                              >
                                {copiadoId === propiedad.id
                                  ? <Check className="h-4 w-4 text-green-600" />
                                  : <Copy className="h-4 w-4" />}
                              </button>
                            </div>
                            <p className="text-xs text-cyan-600">
                              Envía este enlace al interesado por WhatsApp o correo.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {nextCursor && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={cargarMas}
                disabled={cargandoMas}
                className="min-w-[200px]"
              >
                {cargandoMas ? "Cargando..." : "Ver más propiedades"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
