"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ContratoConRelaciones } from "@/lib/types/database"
import { FileText, Download, Edit, ArrowLeft, Trash2 } from "lucide-react"

export default function ContratoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const [contrato, setContrato] = useState<ContratoConRelaciones | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/contratos/${params.id}`)
      .then((res) => res.json())
      .then(setContrato)
      .catch(() => setContrato(null))
      .finally(() => setLoading(false))
  }, [params.id])

  async function handleDelete() {
    if (!confirm("¿Eliminar este contrato?")) return
    const res = await fetch(`/api/contratos/${params.id}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/contratos")
    }
  }

  async function handleDownloadPDF() {
    window.open(`/api/contratos/${params.id}/generar-pdf`, "_blank")
  }

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })
  }

  const estadoColors: Record<string, string> = {
    borrador: "bg-gray-100 text-gray-800",
    activo: "bg-green-100 text-green-800",
    terminado: "bg-blue-100 text-blue-800",
    vencido: "bg-red-100 text-red-800",
  }

  const estadoLabels: Record<string, string> = {
    borrador: "Borrador",
    activo: "Activo",
    terminado: "Terminado",
    vencido: "Vencido",
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando contrato...</p>
  }

  if (!contrato) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contrato no encontrado</CardTitle>
          <CardDescription>El contrato que buscas no existe.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/contratos">Volver a contratos</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contratos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Contrato</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/contratos/${contrato.id}/editar`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info del contrato */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Información del Contrato</CardTitle>
                  <CardDescription>Detalles del contrato de arrendamiento</CardDescription>
                </div>
                <span
                  className={`rounded px-3 py-1 text-sm font-medium ${estadoColors[contrato.estado]}`}
                >
                  {estadoLabels[contrato.estado]}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de inicio</p>
                  <p className="font-medium">{formatDate(contrato.fecha_inicio)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de término</p>
                  <p className="font-medium">{formatDate(contrato.fecha_fin)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duración</p>
                  <p className="font-medium">{contrato.duracion_meses} meses</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Canon mensual</p>
                  <p className="text-xl font-bold">{formatPeso(contrato.canon_mensual)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ciudad de firma</p>
                <p className="font-medium">{contrato.ciudad_firma}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Propiedad</CardTitle>
              <CardDescription>Inmueble objeto del contrato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Dirección</p>
                <p className="font-medium">{contrato.propiedad?.direccion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ciudad</p>
                  <p className="font-medium">{contrato.propiedad?.ciudad}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Barrio</p>
                  <p className="font-medium">{contrato.propiedad?.barrio}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info de las partes */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Arrendatario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{contrato.arrendatario?.nombre}</p>
              <p className="text-sm text-muted-foreground">C.C. {contrato.arrendatario?.cedula}</p>
              {contrato.arrendatario?.email && (
                <p className="text-sm text-muted-foreground">{contrato.arrendatario.email}</p>
              )}
              {contrato.arrendatario?.celular && (
                <p className="text-sm text-muted-foreground">{contrato.arrendatario.celular}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Propietario (Arrendador)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{contrato.propietario?.nombre || "N/A"}</p>
              <p className="text-sm text-muted-foreground">{contrato.propietario?.email}</p>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <Button className="w-full" onClick={handleDownloadPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Generar Contrato PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
