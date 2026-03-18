"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentosContrato } from "@/components/contratos/documentos-contrato"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLang } from "@/lib/i18n/context"

type Contrato = {
  id: string
  numero: number | null
  propiedad: {
    direccion: string
    ciudad: string
  } | null
  arrendatario: {
    nombre: string
  } | null
  propietario: {
    nombre: string | null
    email: string
  } | null
}

export default function DocumentosPage() {
  const { t } = useLang()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contratoSeleccionado, setContratoSeleccionado] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar lista de contratos para el selector
    fetch("/api/contratos")
      .then((res) => res.json())
      .then((data) => {
        setContratos(data)
        // Seleccionar el primer contrato por defecto
        if (data.length > 0) {
          setContratoSeleccionado(data[0].id)
        }
      })
      .catch(() => setContratos([]))
      .finally(() => setLoading(false))
  }, [])

  const contratoActual = contratos.find((c) => c.id === contratoSeleccionado)

  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          {t.reportes.volverReportes}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Documentos por Contrato</h1>
        <p className="text-muted-foreground">
          Gestiona los documentos adjuntos de los contratos
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando contratos...</p>
      ) : contratos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay contratos</CardTitle>
            <CardDescription>
              No hay contratos disponibles para gestionar documentos
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Seleccionar Contrato</CardTitle>
              <CardDescription>
                Elige el contrato al que deseas gestionar los documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={contratoSeleccionado} onValueChange={setContratoSeleccionado}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      #{c.numero || "N/A"} - {c.propiedad?.direccion || "Sin dirección"} - {c.arrendatario?.nombre || "Sin arrendatario"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {contratoActual && (
                <div className="mt-4 rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium">
                    Contrato #{contratoActual.numero || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {contratoActual.propiedad?.direccion}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {contratoActual.propiedad?.ciudad}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Arrendatario: {contratoActual.arrendatario?.nombre}
                  </p>
                  {contratoActual.propietario && (
                    <p className="text-sm text-muted-foreground">
                      Propietario: {contratoActual.propietario.nombre || contratoActual.propietario.email}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {contratoSeleccionado && (
            <DocumentosContrato
              contratoId={contratoSeleccionado}
              puedeEditar={true}
            />
          )}
        </>
      )}
    </div>
  )
}
