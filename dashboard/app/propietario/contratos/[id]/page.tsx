"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
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
import { FileText, Download, ArrowLeft, FileCheck2 } from "lucide-react"
import { DocumentosContrato } from "@/components/contratos/documentos-contrato"
import { RecibosContrato } from "@/components/contratos/recibos-contrato"

export default function PropietarioContratoDetallePage() {
  const params = useParams()
  const [contrato, setContrato] = useState<ContratoConRelaciones | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isPropietario, setIsPropietario] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    Promise.all([
      fetch(`/api/contratos/${params.id}`).then((res) => res.json()),
      fetch("/api/auth/me").then((res) => res.json())
    ]).then(([contratoData, userData]) => {
      setContrato(contratoData)
      const role = userData?.role
      setIsAdmin(role === "admin")
      setIsPropietario(role === "propietario")
    }).catch(() => setContrato(null))
      .finally(() => setLoading(false))
  }, [params.id])

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
    pendiente_cierre: "bg-amber-100 text-amber-800",
  }

  const estadoLabels: Record<string, string> = {
    borrador: "Borrador",
    activo: "Activo",
    terminado: "Terminado",
    vencido: "Vencido",
    pendiente_cierre: "Pendiente de cierre",
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>
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
            <Link href="/propietario/contratos">Volver a contratos</Link>
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
            <Link href="/propietario/contratos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Detalle del Contrato</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          {(isAdmin || isPropietario) && (
            <Button variant="secondary" asChild>
              <Link href={`/propietario/contratos/${params.id}/terminacion`}>
                <FileCheck2 className="mr-2 h-4 w-4" />
                Terminación de contrato
              </Link>
            </Button>
          )}
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
              {contrato.propiedad?.matricula_inmobiliaria && (
                <div>
                  <p className="text-sm text-muted-foreground">Matrícula inmobiliaria</p>
                  <p className="font-medium">{contrato.propiedad.matricula_inmobiliaria}</p>
                </div>
              )}
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

      {/* Sección de documentos del contrato */}
      {mounted && (
        <DocumentosContrato
          contratoId={contrato.id}
          puedeEditar={isAdmin || isPropietario}
        />
      )}

      {/* Sección de recibos del contrato */}
      {mounted && (
        <RecibosContrato
          contratoId={contrato.id}
          puedeEditar={isAdmin || isPropietario}
        />
      )}
    </div>
  )
}
