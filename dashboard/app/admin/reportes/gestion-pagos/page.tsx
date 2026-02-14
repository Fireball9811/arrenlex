"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
}

export default function AdminGestionPagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPagos([
      { id: "1", inquilino: "Juan Pérez", propietario: "María González", direccion: "Calle 123", monto: 1200000, periodo: "Enero 2026", estado: "Completado", metodo: "PSE", referencia: "REF-001", fecha_pago: "2026-01-15" },
      { id: "2", inquilino: "Carlos Ramírez", propietario: "María González", direccion: "Cra 456", monto: 950000, periodo: "Febrero 2026", estado: "Pendiente", metodo: "Transferencia", referencia: "REF-002", fecha_pago: "2026-02-10" },
    ])
    setLoading(false)
  }, [])

  const formatPeso = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)
  const estadoClass = (e: string) => e === "Completado" ? "bg-green-100 text-green-800" : e === "Pendiente" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/reportes" className="text-sm text-muted-foreground hover:underline">← Volver a Reportes</Link>
        <h1 className="mt-2 text-3xl font-bold">Gestión de Pagos</h1>
        <p className="text-muted-foreground">Ver todos los pagos del sistema</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Pagos</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Cargando...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Inquilino</th>
                    <th className="p-3 text-left">Propietario</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3 text-center">Periodo</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="p-3">{p.inquilino}</td>
                      <td className="p-3">{p.propietario}</td>
                      <td className="p-3 text-right font-semibold">{formatPeso(p.monto)}</td>
                      <td className="p-3 text-center">{p.periodo}</td>
                      <td className="p-3 text-center"><span className={`rounded px-2 py-1 text-xs ${estadoClass(p.estado)}`}>{p.estado}</span></td>
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
