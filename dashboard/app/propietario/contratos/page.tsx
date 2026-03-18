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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ContratoConRelaciones } from "@/lib/types/database"

type Propietario = {
  id: string
  email: string
  nombre: string | null
  cedula: string | null
}

export default function PropietarioContratosPage() {
  const [contratos, setContratos] = useState<ContratoConRelaciones[]>([])
  const [contratosFiltrados, setContratosFiltrados] = useState<ContratoConRelaciones[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [propietarios, setPropietarios] = useState<Propietario[]>([])
  const [filtroPropietario, setFiltroPropietario] = useState<string>("")
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const [mounted, setMounted] = useState(false)

  // Cargar contratos
  useEffect(() => {
    let url = "/api/contratos"
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setContratos(data)
        setContratosFiltrados(data)
      })
      .finally(() => setLoading(false))
  }, [])

  // Aplicar filtros cuando cambian
  useEffect(() => {
    let filtrados = [...contratos]

    // Filtro por propietario (solo admin)
    if (userRole === "admin" && filtroPropietario) {
      filtrados = filtrados.filter(c => c.propiedad?.user_id === filtroPropietario)
    }

    // Filtro por estado
    if (filtroEstado !== "todos") {
      filtrados = filtrados.filter(c => c.estado === filtroEstado)
    }

    setContratosFiltrados(filtrados)
  }, [filtroPropietario, filtroEstado, contratos, userRole])

  // Cargar rol y propietarios (solo admin)
  useEffect(() => {
    setMounted(true)
    Promise.all([
      fetch("/api/auth/role").then(r => r.json()),
      fetch("/api/admin/propietarios").then(r => r.json().catch(() => []))
    ]).then(([roleData, propData]) => {
      setUserRole(roleData.role)
      setPropietarios(propData)
    }).catch(() => {
      // Si falla, asumir que no es admin
      setUserRole("propietario")
    })
  }, [])

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
    borrador: "bg-gray-100 text-gray-800",
    activo: "bg-green-100 text-green-800",
    terminado: "bg-blue-100 text-blue-800",
    vencido: "bg-red-100 text-red-800",
  }

  const estadoLabels: Record<string, string> = {
    borrador: "Borrador",
    activo: "Activo",
    terminado: "Terminado",
    vencido: "Vencido",
    todos: "Todos",
  }

  const limpiarFiltros = () => {
    setFiltroPropietario("")
    setFiltroEstado("todos")
  }

  return (
    <div>
      {/* Header con título y botón nuevo */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Contratos</h1>
        <Button asChild>
          <Link href="/propietario/nuevo">Nuevo Contrato</Link>
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">Filtros:</span>
            <div className="flex flex-wrap items-center gap-3">
              {/* Filtro por propietario (solo admin) */}
              {mounted && userRole === "admin" && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Propietario:</label>
                  <Select value={filtroPropietario} onValueChange={setFiltroPropietario}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {propietarios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre || p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Filtro por estado */}
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
              {(filtroPropietario || filtroEstado !== "todos") && (
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

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : contratosFiltrados.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {filtroPropietario || filtroEstado !== "todos"
                ? "No se encontraron contratos con los filtros aplicados"
                : "No hay contratos"}
            </CardTitle>
            <CardDescription>
              {filtroPropietario || filtroEstado !== "todos"
                ? "Prueba con otros filtros o límpialos para ver todos los contratos"
                : "No tienes contratos registrados aún. Crea tu primer contrato."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(filtroPropietario || filtroEstado !== "todos") ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : (
              <Button asChild>
                <Link href="/propietario/nuevo">Nuevo Contrato</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Vista de tabla/lista */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-semibold">Propiedad</th>
                  <th className="text-left p-4 font-semibold">Arrendatario</th>
                  <th className="text-left p-4 font-semibold">Propietario</th>
                  <th className="text-left p-4 font-semibold">Fechas</th>
                  <th className="text-left p-4 font-semibold">Canon</th>
                  <th className="text-center p-4 font-semibold">Estado</th>
                  <th className="text-right p-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contratosFiltrados.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                    {/* Propiedad */}
                    <td className="p-4">
                      <div className="font-medium">{c.propiedad?.direccion}</div>
                      <div className="text-muted-foreground text-xs">
                        {c.propiedad?.ciudad} · {c.propiedad?.barrio}
                      </div>
                    </td>

                    {/* Arrendatario */}
                    <td className="p-4">
                      <div className="font-medium">{c.arrendatario?.nombre}</div>
                      <div className="text-muted-foreground text-xs">
                        {c.arrendatario?.cedula || "Sin cédula"}
                      </div>
                    </td>

                    {/* Propietario (visible para admin) */}
                    <td className="p-4">
                      {mounted && userRole === "admin" && c.propietario ? (
                        <>
                          <div className="font-medium">{c.propietario.nombre}</div>
                          <div className="text-muted-foreground text-xs">
                            {c.propietario.email}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Fechas */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div>
                          <span className="text-muted-foreground text-xs">Inicio: </span>
                          {formatDate(c.fecha_inicio)}
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Fin: </span>
                          {formatDate(c.fecha_fin)}
                        </div>
                      </div>
                    </td>

                    {/* Canon */}
                    <td className="p-4">
                      <div className="font-semibold">{formatPeso(c.canon_mensual)}</div>
                    </td>

                    {/* Estado */}
                    <td className="p-4">
                      <div className="flex justify-center">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${estadoColors[c.estado] ?? "bg-gray-100 text-gray-800"}`}
                        >
                          {estadoLabels[c.estado] || c.estado}
                        </span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/propietario/contratos/${c.id}`}>Ver</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer con resumen */}
          <div className="p-4 border-t bg-muted/30 text-sm text-muted-foreground">
            Total: {contratosFiltrados.length} contrato{contratosFiltrados.length !== 1 ? "s" : ""}
          </div>
        </Card>
      )}
    </div>
  )
}
