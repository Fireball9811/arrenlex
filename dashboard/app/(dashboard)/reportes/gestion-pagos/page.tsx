"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Pago {
  id: string
  inquilino: string
  propietario: string
  propiedad_id: string
  direccion: string
  monto: number
  periodo: string
  estado: string
  metodo: string
  referencia: string
  fecha_pago: string
  fecha_aprobacion: string
}

export default function GestionPagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  useEffect(() => {
    // Aquí se obtendrían todos los pagos del sistema
    // Por ahora usamos datos de ejemplo
    setPagos([
      {
        id: "1",
        inquilino: "Juan Pérez",
        propietario: "María González",
        propiedad_id: "prop-1",
        direccion: "Calle 123 # 456",
        monto: 1200000,
        periodo: "Enero 2026",
        estado: "Completado",
        metodo: "PSE",
        referencia: "REF-20260115-001",
        fecha_pago: "2026-01-15",
        fecha_aprobacion: "2026-01-15 14:32",
      },
      {
        id: "2",
        inquilino: "Carlos Ramírez",
        propietario: "María González",
        propiedad_id: "prop-2",
        direccion: "Cra 456 # 789",
        monto: 950000,
        periodo: "Febrero 2026",
        estado: "Pendiente",
        metodo: "Transferencia",
        referencia: "REF-20260210-002",
        fecha_pago: "2026-02-10",
        fecha_aprobacion: "-",
      },
      {
        id: "3",
        inquilino: "Ana Martínez",
        propietario: "Carlos López",
        propiedad_id: "prop-3",
        direccion: "Av. Siempre 123",
        monto: 1500000,
        periodo: "Febrero 2026",
        estado: "Rechazado",
        metodo: "PSE",
        referencia: "REF-20260212-003",
        fecha_pago: "2026-02-05",
        fecha_aprobacion: "2026-02-06 10:15",
      },
    ])
    setLoading(false)
  }, [])

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  const estadoClass = (estado: string) => {
    switch (estado) {
      case "Completado": return "bg-green-100 text-green-800"
      case "Pendiente": return "bg-amber-100 text-amber-800"
      case "Rechazado": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Gestión de Pagos</h1>
        <p className="text-muted-foreground">
          Ver todos los pagos del sistema y registrar nuevos
        </p>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Pagos</p>
            <p className="text-2xl font-bold">{pagos.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Completados</p>
            <p className="text-2xl font-bold text-green-600">
              {formatPeso(pagos.filter(p => p.estado === "Completado").reduce((a, b) => a + b.monto, 0))}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatPeso(pagos.filter(p => p.estado === "Pendiente").reduce((a, b) => a + b.monto, 0))}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Rechazados</p>
            <p className="text-2xl font-bold text-red-600">
              {formatPeso(pagos.filter(p => p.estado === "Rechazado").reduce((a, b) => a + b.monto, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones */}
      <div className="mb-6 flex gap-4">
        <Button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          variant={mostrarFormulario ? "outline" : "default"}
        >
          {mostrarFormulario ? "Cancelar" : "📝 Registrar Nuevo Pago"}
        </Button>

        <Button variant="outline" asChild>
          <Link href="/reportes/financiero">💰 Ver Reporte Financiero</Link>
        </Button>
      </div>

      {/* Formulario de registro (condicional) */}
      {mostrarFormulario && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Registrar Nuevo Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Inquilino *</label>
                  <select className="w-full rounded border p-2" required>
                    <option value="">Seleccionar inquilino...</option>
                    <option value="1">Juan Pérez</option>
                    <option value="2">Carlos Ramírez</option>
                    <option value="3">Ana Martínez</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Propietario *</label>
                  <select className="w-full rounded border p-2" required>
                    <option value="">Seleccionar propietario...</option>
                    <option value="1">María González</option>
                    <option value="2">Carlos López</option>
                    <option value="3">Roberto Díaz</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Propiedad *</label>
                <select className="w-full rounded border p-2" required>
                  <option value="">Seleccionar propiedad...</option>
                  <option value="prop-1">Calle 123 # 456</option>
                  <option value="prop-2">Cra 456 # 789</option>
                  <option value="prop-3">Av. Siempre 123</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monto *</label>
                  <input
                    type="number"
                    className="w-full rounded border p-2"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Periodo *</label>
                  <input
                    type="month"
                    className="w-full rounded border p-2"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Método de Pago</label>
                  <select className="w-full rounded border p-2">
                    <option value="PSE">PSE</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Referencia Bancaria</label>
                <input
                  type="text"
                  className="w-full rounded border p-2"
                  placeholder="Últimos 4 dígitos"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMostrarFormulario(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Registrar Pago</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabla de pagos */}
      <Card>
        <CardHeader>
          <CardTitle>Todos los Pagos del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando pagos...</p>
          ) : pagos.length === 0 ? (
            <p className="text-muted-foreground">No hay pagos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Inquilino</th>
                    <th className="p-3 text-left">Propietario</th>
                    <th className="p-3 text-left">Dirección</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3 text-center">Periodo</th>
                    <th className="p-3 text-center">Método</th>
                    <th className="p-3 text-left">Referencia</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-left">Fecha Pago</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="border-b">
                      <td className="p-3">{pago.inquilino}</td>
                      <td className="p-3">{pago.propietario}</td>
                      <td className="p-3 text-xs">{pago.direccion}</td>
                      <td className="p-3 text-right font-semibold">
                        {formatPeso(pago.monto)}
                      </td>
                      <td className="p-3 text-center">{pago.periodo}</td>
                      <td className="p-3 text-center">{pago.metodo}</td>
                      <td className="p-3">
                        <code className="text-xs bg-gray-100 rounded px-1">
                          {pago.referencia}
                        </code>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${estadoClass(pago.estado)}`}>
                          {pago.estado}
                        </span>
                      </td>
                      <td className="p-3 text-xs">{pago.fecha_pago}</td>
                      <td className="p-3 text-center">
                        {pago.estado === "Pendiente" && (
                          <Button size="sm" variant="outline">
                            ✅ Aprobar
                          </Button>
                        )}
                        {pago.estado === "Pendiente" && (
                          <Button size="sm" variant="destructive" className="ml-2">
                            ❌ Rechazar
                          </Button>
                        )}
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
