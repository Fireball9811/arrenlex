"use client"

import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface IngresosGastosChartProps {
  propiedadId?: string
  aniosAtras: number
  vistaMensual: boolean
}

interface FinanzasData {
  nombre: string
  periodo: string
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

const formatCOP = (valor: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor)
}

export function IngresosGastosChart({
  propiedadId,
  aniosAtras,
  vistaMensual,
}: IngresosGastosChartProps) {
  const [data, setData] = useState<FinanzasData[]>([])
  const [totales, setTotales] = useState({ ingresos: 0, gastos: 0, gananciaNeta: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      console.log("[IngresosGastosChart] Fetching data...", { propiedadId, aniosAtras, vistaMensual })
      try {
        const params = new URLSearchParams({
          anios: String(aniosAtras),
          vista: vistaMensual ? "mensual" : "anual",
        })

        if (propiedadId) {
          params.append("propiedadId", propiedadId)
        }

        const url = `/api/propietario/finanzas?${params.toString()}`
        console.log("[IngresosGastosChart] Fetching from:", url)

        const res = await fetch(url)
        console.log("[IngresosGastosChart] Response status:", res.status)

        if (!res.ok) {
          const errorText = await res.text()
          console.error("[IngresosGastosChart] Error response:", errorText)
          throw new Error("Error al cargar datos")
        }

        const json: FinanzasResponse = await res.json()
        console.log("[IngresosGastosChart] Data received:", json)

        setData(json.datos || [])
        setTotales(json.totales || { ingresos: 0, gastos: 0, gananciaNeta: 0 })
      } catch (error) {
        console.error("[IngresosGastosChart] Error fetching financial data:", error)
        setData([])
        setTotales({ ingresos: 0, gastos: 0, gananciaNeta: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [propiedadId, aniosAtras, vistaMensual])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando datos...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">No hay datos disponibles para el período seleccionado</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Gráfica */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="nombre"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value, name) => [
                formatCOP(Number(value ?? 0)),
                name === "ingresos" ? "Ingresos" :
                name === "gastos" ? "Gastos" : "Ganancia Neta"
              ]}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => {
                if (value === "ingresos") return "Ingresos"
                if (value === "gastos") return "Gastos"
                if (value === "gananciaNeta") return "Ganancia Neta"
                return value
              }}
            />
            <Bar
              dataKey="ingresos"
              fill="hsl(var(--primary))"
              name="ingresos"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="gastos"
              fill="hsl(var(--destructive))"
              name="gastos"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="gananciaNeta"
              fill={totales.gananciaNeta >= 0 ? "#22c55e" : "#ef4444"}
              name="gananciaNeta"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center p-4 rounded-lg bg-primary/5">
          <p className="text-sm text-muted-foreground">Ingresos Totales</p>
          <p className="text-2xl font-bold text-primary">{formatCOP(totales.ingresos)}</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-destructive/5">
          <p className="text-sm text-muted-foreground">Gastos Totales</p>
          <p className="text-2xl font-bold text-destructive">{formatCOP(totales.gastos)}</p>
        </div>
        <div className={`text-center p-4 rounded-lg ${totales.gananciaNeta >= 0 ? "bg-green-500/5" : "bg-red-500/5"}`}>
          <p className="text-sm text-muted-foreground">Ganancia Neta</p>
          <p className={`text-2xl font-bold ${totales.gananciaNeta >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCOP(totales.gananciaNeta)}
          </p>
        </div>
      </div>
    </div>
  )
}
