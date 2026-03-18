"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ContratoConRelaciones } from "@/lib/types/database"
import { useLang } from "@/lib/i18n/context"

export default function ContratosPage() {
  const { t } = useLang()
  const [contratos, setContratos] = useState<ContratoConRelaciones[]>([])
  const [contratosFiltrados, setContratosFiltrados] = useState<ContratoConRelaciones[]>([])
  const [loading, setLoading] = useState(true)
  const [activando, setActivando] = useState(false)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Filtros (solo admin)
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")

  useEffect(() => {
    // Cargar contratos y verificar si es admin
    Promise.all([
      fetch("/api/contratos").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json())
    ]).then(([contratosData, userData]) => {
      setContratos(contratosData)
      setContratosFiltrados(contratosData)
      setIsAdmin(userData?.role === "admin")
    }).finally(() => setLoading(false))
  }, [])

  // Aplicar filtros cuando cambian
  useEffect(() => {
    let filtrados = [...contratos]

    if (isAdmin) {
      // Filtro por estado
      if (filtroEstado !== "todos") {
        filtrados = filtrados.filter(c => c.estado === filtroEstado)
      }
    }

    setContratosFiltrados(filtrados)
  }, [filtroEstado, contratos, isAdmin])

  const limpiarFiltros = () => {
    setFiltroEstado("todos")
  }

  async function handleDelete(id: string) {
    if (!confirm(t.contratos.confirmarEliminar)) return
    const res = await fetch(`/api/contratos/${id}`, { method: "DELETE" })
    if (res.ok) {
      setContratos((prev) => prev.filter((c) => c.id !== id))
    }
  }

  async function activarBorradores() {
    if (!confirm("¿Activar todos los contratos en estado borrador?")) return

    setActivando(true)
    try {
      // Activar cada contrato en borrador
      const borradores = contratos.filter(c => c.estado === "borrador")

      for (const contrato of borradores) {
        await fetch(`/api/contratos/${contrato.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: "activo" })
        })
      }

      // Recargar la lista
      const res = await fetch("/api/contratos")
      const data = await res.json()
      setContratos(data)
    } catch (error) {
      alert("Error al activar contratos")
    } finally {
      setActivando(false)
    }
  }

  async function corregirContratos() {
    if (!confirm("¿Corregir los contratos para que los propietarios puedan verlos? Esto actualizará el propietario asociado a cada contrato.")) return

    setCorrigiendo(true)
    try {
      const res = await fetch("/api/admin/corregir-contratos", { method: "POST" })
      const data = await res.json()

      if (res.ok) {
        alert(`✓ ${data.correccionesRealizadas} contratos corregidos`)
        // Recargar la lista
        const res2 = await fetch("/api/contratos")
        const data2 = await res2.json()
        setContratos(data2)
      } else {
        alert("Error: " + data.error)
      }
    } catch (error) {
      alert("Error al corregir contratos")
    } finally {
      setCorrigiendo(false)
    }
  }

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  const estadoColors: Record<string, string> = {
    borrador: "bg-gray-100 text-gray-800 border-gray-200",
    activo: "bg-green-100 text-green-800 border-green-200",
    terminado: "bg-blue-100 text-blue-800 border-blue-200",
    vencido: "bg-red-100 text-red-800 border-red-200",
  }

  const estadoLabels: Record<string, string> = {
    borrador: "Borrador",
    activo: "Activo",
    terminado: "Terminado",
    vencido: "Vencido",
    todos: "Todos",
  }

  return (
    <div className="space-y-6">
      {/* Header con título y botones de acción */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">{t.contratos.titulo}</h1>
        <div className="flex flex-wrap gap-2">
          {contratosFiltrados.some(c => c.estado === "borrador") && (
            <Button
              variant="outline"
              onClick={activarBorradores}
              disabled={activando}
            >
              {activando ? "Activando..." : "Activar Borradores"}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={corregirContratos}
              disabled={corrigiendo}
            >
              {corrigiendo ? "Corrigiendo..." : "Corregir Contratos"}
            </Button>
          )}
          <Button asChild>
            <Link href="/contratos/nuevo">{t.contratos.nuevoContrato}</Link>
          </Button>
        </div>
      </div>

      {/* Filtros (solo visible para admin) */}
      {isAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Estado:</label>
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="terminado">Terminado</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filtroEstado !== "todos" && (
                  <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                {contratosFiltrados.length} {contratosFiltrados.length === 1 ? "contrato" : "contratos"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenido principal */}
      {loading ? (
        <p className="text-muted-foreground">{t.contratos.cargando}</p>
      ) : contratosFiltrados.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {filtroEstado !== "todos"
                ? "No se encontraron contratos con los filtros aplicados"
                : t.contratos.sinContratos}
            </CardTitle>
            <CardDescription>
              {filtroEstado !== "todos"
                ? "Prueba con otros filtros o límpialos para ver todos los contratos"
                : t.contratos.sinContratosDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtroEstado !== "todos" ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : (
              <Button asChild>
                <Link href="/contratos/nuevo">{t.contratos.nuevoContrato}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">N°</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Arrendatario</TableHead>
                    {isAdmin && <TableHead>Propietario</TableHead>}
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Canon Mensual</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosFiltrados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">#{c.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{c.propiedad?.direccion || "-"}</span>
                          <span className="text-sm text-muted-foreground">{c.propiedad?.ciudad || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell>{c.arrendatario?.nombre || "-"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{c.propietario?.nombre || c.propietario?.email || "-"}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(c.fecha_inicio)}</div>
                          <div className="text-muted-foreground">→ {formatDate(c.fecha_fin)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPeso(c.canon_mensual)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${estadoColors[c.estado] ?? "bg-gray-100 text-gray-800 border-gray-200"}`}
                        >
                          {estadoLabels[c.estado] || c.estado}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/contratos/${c.id}`} title="Ver">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/contratos/${c.id}/editar`} title="Editar">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                              </svg>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(c.id)}
                            title="Eliminar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"/>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
