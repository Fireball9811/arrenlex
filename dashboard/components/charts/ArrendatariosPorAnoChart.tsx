"use client"

import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts"

interface ArrendatariosPorAnoChartProps {
  propiedadId?: string
  aniosAtras: number
}

interface ArrendatarioAnoData {
  ano: number
  cantidad: number
}

interface FinanzasResponse {
  arrendatariosPorAno: ArrendatarioAnoData[]
}

export function ArrendatariosPorAnoChart({
  propiedadId,
  aniosAtras,
}: ArrendatariosPorAnoChartProps) {
  const [data, setData] = useState<ArrendatarioAnoData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          anios: String(aniosAtras),
          vista: "anual", // Siempre anual para esta gráfica
        })

        if (propiedadId) {
          params.append("propiedadId", propiedadId)
        }

        const res = await fetch(`/api/propietario/finanzas?${params.toString()}`)
        if (!res.ok) throw new Error("Error al cargar datos")

        const json: FinanzasResponse = await res.json()
        setData(json.arrendatariosPorAno || [])
      } catch (error) {
        console.error("Error fetching tenants data:", error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [propiedadId, aniosAtras])

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
        <div className="text-muted-foreground">No hay datos de arrendatarios para el período seleccionado</div>
      </div>
    )
  }

  // Generar colores diferentes para cada barra
  const colors = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
    "#06b6d4", "#6366f1", "#f97316", "#14b8a6", "#eab308"
  ]

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="ano"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value) => [`${value ?? 0} arrendatario(s)`, "Cantidad"]}
          />
          <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Resumen */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Total de arrendatarios únicos en {aniosAtras} {aniosAtras === 1 ? "año" : "años"}:{" "}
          <span className="font-bold text-foreground">
            {new Set(data.flatMap(d => Array.from({ length: d.cantidad }, (_, i) => `${d.ano}-${i}`))).size}
          </span>
        </p>
      </div>
    </div>
  )
}
