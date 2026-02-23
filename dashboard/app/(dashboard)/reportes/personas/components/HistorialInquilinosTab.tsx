"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"
import type { Perfil } from "@/lib/types/database"

export function HistorialInquilinosTab() {
  const [inquilinos, setInquilinos] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistorial()
  }, [])

  async function fetchHistorial() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/usuarios")
      const data = await res.json()
      // Inquilinos inactivos o bloqueados
      const historial = (data || []).filter((u: Perfil) =>
        u.role === "inquilino" && (!u.activo || u.bloqueado)
      )
      setInquilinos(historial)
    } catch (error) {
      console.error("Error fetching historial:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Historial de Inquilinos</h2>
        <p className="text-muted-foreground">Inquilinos inactivos o bloqueados en el sistema</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Historial ({inquilinos.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : inquilinos.length === 0 ? (
            <p className="text-muted-foreground">No hay inquilinos inactivos o bloqueados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Inquilino</th>
                    <th className="p-3 text-left">Cédula</th>
                    <th className="p-3 text-left">Celular</th>
                    <th className="p-3 text-left">Fecha registro</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {inquilinos.map((i) => (
                    <tr key={i.id} className={`border-b ${i.bloqueado ? "bg-red-50" : "bg-amber-50"}`}>
                      <td className="p-3">
                        <p className="font-medium">{i.nombre || "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{i.email}</p>
                      </td>
                      <td className="p-3">{i.cedula || "—"}</td>
                      <td className="p-3">{i.celular || "—"}</td>
                      <td className="p-3">
                        {new Date(i.creado_en).toLocaleDateString("es-CO")}
                      </td>
                      <td className="p-3 text-center">
                        {i.bloqueado ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800 flex items-center gap-1 w-fit mx-auto">
                            <XCircle className="h-3 w-3" /> Bloqueado
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800 flex items-center gap-1 w-fit mx-auto">
                            Inactivo
                          </span>
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
