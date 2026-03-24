"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, AlertCircle, Phone, Mail, Home } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Propiedad {
  id: string
  direccion: string
  ciudad: string
  barrio: string
  valor_arriendo: number
}

interface Arrendatario {
  id: string
  nombre: string
  celular: string
  email: string
}

interface Pendiente {
  contrato_id: string
  propiedad: Propiedad | null
  arrendatario: Arrendatario | null
}

interface PendientesResponse {
  pendientes: Pendiente[]
  mes: string
  primer_dia: string
  ultimo_dia: string
}

const MESES: Record<string, string> = {
  "01": "Enero",
  "02": "Febrero",
  "03": "Marzo",
  "04": "Abril",
  "05": "Mayo",
  "06": "Junio",
  "07": "Julio",
  "08": "Agosto",
  "09": "Septiembre",
  "10": "Octubre",
  "11": "Noviembre",
  "12": "Diciembre",
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

function getNombreMes(mesStr: string) {
  const [anio, mes] = mesStr.split("-")
  return `${MESES[mes] ?? mes} ${anio}`
}

export default function PendientesMesPage() {
  const [datos, setDatos] = useState<PendientesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/propietario/pendientes-mes")
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar pendientes")
        return res.json() as Promise<PendientesResponse>
      })
      .then((json) => setDatos(json))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error desconocido"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div suppressHydrationWarning>
      {/* Encabezado */}
      <div className="mb-6">
        <Link
          href="/reportes/financiero"
          className="mb-2 flex items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Financiero
        </Link>
        <h1 className="text-3xl font-bold">Pendientes por pagar</h1>
        {datos && (
          <p className="text-muted-foreground">
            {getNombreMes(datos.mes)} — propiedades sin recibo registrado este mes
          </p>
        )}
      </div>

      {/* Cargando */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Cargando...
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Todos al día */}
      {!loading && !error && datos && datos.pendientes.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle className="h-14 w-14 text-green-500" />
            <p className="text-lg font-semibold text-green-800">
              Todos los arrendatarios han pagado este mes
            </p>
            <p className="text-sm text-green-600">
              No hay propiedades pendientes de pago en {datos ? getNombreMes(datos.mes) : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de pendientes */}
      {!loading && !error && datos && datos.pendientes.length > 0 && (
        <>
          {/* Resumen */}
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Propiedades pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-800">{datos.pendientes.length}</p>
                <p className="text-xs text-amber-600">sin recibo en {getNombreMes(datos.mes)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monto estimado pendiente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatCOP(
                    datos.pendientes.reduce(
                      (sum, p) => sum + (p.propiedad?.valor_arriendo ?? 0),
                      0
                    )
                  )}
                </p>
                <p className="text-xs text-muted-foreground">según valor de arriendo registrado</p>
              </CardContent>
            </Card>
          </div>

          {/* Tarjetas por pendiente */}
          <div className="grid gap-4 md:grid-cols-2">
            {datos.pendientes.map((item) => (
              <Card key={item.contrato_id} className="border-amber-100">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-amber-100 p-2">
                      <Home className="h-5 w-5 text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold leading-tight">
                        {item.propiedad?.direccion ?? "Propiedad sin dirección"}
                      </p>
                      {item.propiedad?.ciudad && (
                        <p className="text-xs text-muted-foreground">
                          {item.propiedad.barrio ? `${item.propiedad.barrio}, ` : ""}
                          {item.propiedad.ciudad}
                        </p>
                      )}
                    </div>
                    {item.propiedad?.valor_arriendo ? (
                      <span className="text-sm font-bold text-amber-700 whitespace-nowrap">
                        {formatCOP(item.propiedad.valor_arriendo)}
                      </span>
                    ) : null}
                  </div>
                </CardHeader>
                {item.arrendatario && (
                  <CardContent className="pt-0">
                    <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
                      <p className="text-sm font-medium">{item.arrendatario.nombre}</p>
                      {item.arrendatario.celular && (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {item.arrendatario.celular}
                        </p>
                      )}
                      {item.arrendatario.email && (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {item.arrendatario.email}
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
