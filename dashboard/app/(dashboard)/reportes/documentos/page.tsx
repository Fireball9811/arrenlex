"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DocumentosPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Documentos</h1>
        <p className="text-muted-foreground">
          Gestión de documentos y contratos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>📄 Contratos Activos</CardTitle>
            <CardDescription>Contratos de arrendamiento vigentes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">contratos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Contratos Históricos</CardTitle>
            <CardDescription>Archivo de contratos finalizados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">156</p>
            <p className="text-sm text-muted-foreground">contratos archivados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>✍️ Generar Contrato</CardTitle>
            <CardDescription>Crear nuevo contrato de arrendamiento</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Generar...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📎 Documentos Firmados</CardTitle>
            <CardDescription>Documentos con firma digital</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">18</p>
            <p className="text-sm text-muted-foreground">documentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📁 Cargar Documento</CardTitle>
            <CardDescription>Subir nuevos documentos al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Cargar...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔍 Buscar Documentos</CardTitle>
            <CardDescription>Buscar en el repositorio de documentos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Buscar...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
