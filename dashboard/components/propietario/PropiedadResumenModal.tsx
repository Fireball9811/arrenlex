"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PropiedadResumenModalProps {
  open: boolean
  onClose: () => void
  propiedadId: string | null
  propiedadLabel: string
  aniosAtras: number
  vistaMensual: boolean
}

interface FinanzasData {
  nombre: string
  ingresos: number
  gastos: number
  gananciaNeta: number
}

interface FinanzasResponse {
  datos: FinanzasData[]
  totales: {
    ingresos: number
    gastos: number
    gananciaNeta: number
  }
}

const formatCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor)

export function PropiedadResumenModal({
  open,
  onClose,
  propiedadId,
  propiedadLabel,
  aniosAtras,
  vistaMensual,
}: PropiedadResumenModalProps) {
  const [loading, setLoading] = useState(false)
  const [datos, setDatos] = useState<FinanzasData[]>([])
  const [totales, setTotales] = useState({ ingresos: 0, gastos: 0, gananciaNeta: 0 })

  useEffect(() => {
    if (!open || !propiedadId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          propiedadId,
          anios: String(aniosAtras),
          vista: vistaMensual ? "mensual" : "anual",
        })
        const res = await fetch(`/api/propietario/finanzas?${params.toString()}`)
        if (!res.ok) throw new Error("Error al cargar datos")
        const json: FinanzasResponse = await res.json()
        setDatos(json.datos ?? [])
        setTotales(json.totales ?? { ingresos: 0, gastos: 0, gananciaNeta: 0 })
      } catch {
        setDatos([])
        setTotales({ ingresos: 0, gastos: 0, gananciaNeta: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [open, propiedadId, aniosAtras, vistaMensual])

  const periodoLabel = `${aniosAtras} año${aniosAtras > 1 ? "s" : ""} · vista ${vistaMensual ? "mensual" : "anual"}`

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Resumen financiero — {propiedadLabel}</DialogTitle>
          <DialogDescription>{periodoLabel}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground py-8 text-center">Cargando resumen...</p>
        ) : datos.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            No hay datos para el período seleccionado.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right text-blue-600">Ingresos</TableHead>
                    <TableHead className="text-right text-red-600">Gastos</TableHead>
                    <TableHead className="text-right">Ganancia neta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datos.map((row) => (
                    <TableRow key={row.nombre}>
                      <TableCell className="font-medium">{row.nombre}</TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCOP(row.ingresos)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCOP(row.gastos)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          row.gananciaNeta >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCOP(row.gananciaNeta)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCOP(totales.ingresos)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCOP(totales.gastos)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        totales.gananciaNeta >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCOP(totales.gananciaNeta)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
