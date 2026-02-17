"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface PieChartProps {
  data: Array<{ name: string; value: number; color: string }>
}

export function MetricPieChart({ data }: PieChartProps) {
  const filteredData = data.filter(d => d.value > 0)

  if (filteredData.length === 0) {
    return <div className="flex h-40 items-center justify-center text-gray-400 text-sm">Sin datos</div>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
        {filteredData.map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
