"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  FileText,
  Eye,
  Calendar,
  DollarSign,
  Loader2,
} from "lucide-react"

type Recibo = {
  id: string
  contrato_id: string
  arrendador_nombre: string
  valor_arriendo: number
  fecha_inicio_periodo: string
  fecha_fin_periodo: string
  tipo_pago: string
  fecha_recibo: string
  numero_recibo: string
  estado: string
}

type Contrato = {
  id: string
  propiedad_id: string
}

type RecibosContratoProps = {
  contratoId: string
  puedeEditar: boolean
}

export function RecibosContrato({ contratoId, puedeEditar }: RecibosContratoProps) {
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [loading, setLoading] = useState(true)

  const basePath = "/propietario/recibos"

  useEffect(() => {
    cargarDatos()
  }, [contratoId])

  async function cargarDatos() {
    setLoading(true)
    try {
      // Cargar contrato para obtener propiedad_id y recibos
      const [contratoRes, recibosRes] = await Promise.all([
        fetch(`/api/contratos/${contratoId}`),
        fetch(`/api/contratos/${contratoId}/recibos`)
      ])

      if (contratoRes.ok) {
        const contratoData = await contratoRes.json()
        setContrato(contratoData)
      }

      if (recibosRes.ok) {
        const recibosData = await recibosRes.json()
        setRecibos(recibosData)
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recibos del Contrato</CardTitle>
            <CardDescription>
              Recibos de pago asociados a este contrato
            </CardDescription>
          </div>
          {puedeEditar && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={`${basePath}/nuevo?propiedad_id=${contrato?.propiedad_id || ""}`}>
                <FileText className="mr-2 h-4 w-4" />
                Nuevo Recibo
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recibos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No hay recibos asociados a este contrato
            </p>
            {puedeEditar && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                asChild
              >
                <a href={`${basePath}/nuevo?propiedad_id=${contrato?.propiedad_id || ""}`}>
                  Crear Primer Recibo
                </a>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {recibos.map((recibo) => (
              <div
                key={recibo.id}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-sm">
                      Recibo N° {recibo.numero_recibo || "N/A"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({recibo.tipo_pago === "arriendo" ? "Arriendo" : recibo.tipo_pago})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(recibo.fecha_inicio_periodo).toLocaleDateString("es-CO")} - {new Date(recibo.fecha_fin_periodo).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-semibold text-green-700">
                        {formatPeso(recibo.valor_arriendo)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    title="Ver recibo"
                  >
                    <a href={`${basePath}/${recibo.id}`}>
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    title="Vista previa"
                  >
                    <a href={`${basePath}/vista-previa?recibo_id=${recibo.id}`}>
                      <FileText className="h-4 w-4" />
                    </a>
                  </Button>
                  {puedeEditar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      title="Editar recibo"
                    >
                      <a href={`${basePath}/${recibo.id}/editar`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        </svg>
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
