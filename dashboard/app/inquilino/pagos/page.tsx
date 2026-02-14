"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Pago {
  id: string
  fecha: string
  concepto: string
  monto: number
  estado: string
  metodo: string
  referencia: string
  fecha_aprobacion: string
}

export default function InquilinoPagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPagos([
      { id: "1", fecha: "2026-01-15", concepto: "Arriendo Enero 2026", monto: 1200000, estado: "Completado", metodo: "PSE", referencia: "REF-001", fecha_aprobacion: "2026-01-15 14:32" },
      { id: "2", fecha: "2026-02-10", concepto: "Arriendo Febrero 2026", monto: 1200000, estado: "Pendiente", metodo: "PSE", referencia: "REF-002", fecha_aprobacion: "-" },
    ])
    setLoading(false)
  }, [])

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)
  const estadoClass = (e: string) =>
    e === "Completado" ? "bg-green-100 text-green-800" : e === "Pendiente" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"

  return (
    <div>
      <div className="mb-6">
        <Link href="/inquilino/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Volver
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Mis Pagos</h1>
        <p className="text-muted-foreground">Historial de tus pagos realizados</p>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Pagado</p>
            <p className="text-2xl font-bold text-green-600">
              {formatPeso(pagos.filter((p) => p.estado === "Completado").reduce((a, b) => a + b.monto, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatPeso(pagos.filter((p) => p.estado === "Pendiente").reduce((a, b) => a + b.monto, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pagos Totales</p>
            <p className="text-2xl font-bold">{pagos.length}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mis Pagos</CardTitle>
            <Button asChild size="sm">
              <Link href="/reportes/financiero/consignar">Realizar Nuevo Pago</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : pagos.length === 0 ? (
            <p className="text-muted-foreground">No tienes pagos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Fecha</th>
                    <th className="p-3 text-left">Concepto</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="p-3">{p.fecha}</td>
                      <td className="p-3">{p.concepto}</td>
                      <td className="p-3 text-right font-semibold">{formatPeso(p.monto)}</td>
                      <td className="p-3 text-center">
                        <span className={`rounded px-2 py-1 text-xs ${estadoClass(p.estado)}`}>{p.estado}</span>
                      </td>
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
