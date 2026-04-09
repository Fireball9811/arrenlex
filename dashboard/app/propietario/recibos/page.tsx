"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Edit2, Trash2, Download, Eye } from "lucide-react"

interface ReciboPago {
  id: string
  propiedad_id: string
  numero_recibo: string
  arrendador_nombre: string
  propietario_nombre: string
  valor_arriendo: number
  fecha_inicio_periodo: string
  fecha_fin_periodo: string
  tipo_pago: string
  fecha_recibo: string
  estado: string
  created_at: string
}

export default function RecibosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [recibos, setRecibos] = useState<ReciboPago[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargarRecibos = () => {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { role?: string } | null) => {
          if (data?.role === "inquilino") {
            router.replace("/inquilino/dashboard")
            return
          }

          return fetch("/api/recibos-pago")
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`)
              return res.json()
            })
            .then((data: ReciboPago[]) => {
              setRecibos(data)
              setLoading(false)
            })
            .catch((err) => {
              setError(`Error: ${err.message}`)
              setLoading(false)
            })
        })
        .catch(() => {
          setError("Error de autenticación")
          setLoading(false)
        })
    }

    cargarRecibos()

    // Recargar cuando la página gana foco (por si volvemos de editar/enviar)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        cargarRecibos()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router])

  const getEstadoColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "completado":
      case "emitido":
        return "bg-green-100 text-green-800"
      case "borrador":
        return "bg-yellow-100 text-yellow-800"
      case "cancelado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando recibos...</p>
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600 font-semibold">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div suppressHydrationWarning>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recibos de Pago</h1>
          <p className="text-muted-foreground">Gestiona los recibos de pago de tus propiedades</p>
        </div>
        <Link href="/propietario/recibos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Recibo
          </Button>
        </Link>
      </div>

      {recibos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground font-semibold">No tienes recibos de pago</p>
            <p className="text-muted-foreground text-sm mt-1">Comienza creando tu primer recibo</p>
            <Link href="/propietario/recibos/nuevo">
              <Button className="mt-4" variant="default">
                <Plus className="mr-2 h-4 w-4" />
                Crear Recibo
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recibos.map((recibo) => (
            <Card key={recibo.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">
                        Recibo #{recibo.numero_recibo || recibo.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs">Arrendador</p>
                        <p className="font-medium">{recibo.arrendador_nombre}</p>
                      </div>
                      <div>
                        <p className="text-xs">Monto</p>
                        <p className="font-medium text-green-600">
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            maximumFractionDigits: 0,
                          }).format(recibo.valor_arriendo || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs">Período</p>
                        <p className="font-medium">
                          {new Date(recibo.fecha_inicio_periodo).toLocaleDateString("es-CO")} -{" "}
                          {new Date(recibo.fecha_fin_periodo).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs">Fecha Recibo</p>
                        <p className="font-medium">{new Date(recibo.fecha_recibo).toLocaleDateString("es-CO")}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/propietario/recibos/${recibo.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver
                      </Button>
                    </Link>
                    <Link href={`/propietario/recibos/${recibo.id}/editar`}>
                      <Button variant="outline" size="sm">
                        <Edit2 className="mr-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/imprimir-recibo/${recibo.id}`, "_blank")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm("¿Eliminar este recibo?")) {
                          // Implementar eliminación
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
