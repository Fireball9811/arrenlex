"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLang } from "@/lib/i18n/context"

export default function DocumentosPage() {
  const { t } = useLang()

  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          {t.reportes.volverReportes}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{t.reportes.documentosTitulo}</h1>
        <p className="text-muted-foreground">
          {t.reportes.descDocumentos}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.documentosCards.contratosActivos}</CardTitle>
            <CardDescription>{t.reportes.documentosCards.descContratosActivos}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">{t.reportes.documentosCards.contratosActivos2}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.documentosCards.contratosHistoricos}</CardTitle>
            <CardDescription>{t.reportes.documentosCards.descHistoricos}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">156</p>
            <p className="text-sm text-muted-foreground">{t.reportes.documentosCards.contratosArchivados}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.documentosCards.generarContrato}</CardTitle>
            <CardDescription>{t.reportes.documentosCards.descGenerar}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t.reportes.documentosCards.generar}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.documentosCards.documentosFirmados}</CardTitle>
            <CardDescription>{t.reportes.documentosCards.descFirmados}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">18</p>
            <p className="text-sm text-muted-foreground">{t.reportes.documentosCards.documentos}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.documentosCards.cargarDocumento}</CardTitle>
            <CardDescription>{t.reportes.documentosCards.descCargar}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t.reportes.documentosCards.cargar}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reportes.documentosCards.buscarDocumentos}</CardTitle>
            <CardDescription>{t.reportes.documentosCards.descBuscar}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t.reportes.documentosCards.buscar}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
