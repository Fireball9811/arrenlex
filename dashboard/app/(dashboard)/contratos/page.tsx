"use client"

import { useEffect, useState } from "react"
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
import { useLang } from "@/lib/i18n/context"

export default function ContratosPage() {
  const { t } = useLang()
  const [contratos, setContratos] = useState<ContratoConRelaciones[]>([])
  const [loading, setLoading] = useState(true)
  const [activando, setActivando] = useState(false)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Cargar contratos y verificar si es admin
    Promise.all([
      fetch("/api/contratos").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json())
    ]).then(([contratosData, userData]) => {
      setContratos(contratosData)
      setIsAdmin(userData?.role === "admin")
    }).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm(t.contratos.confirmarEliminar)) return
    const res = await fetch(`/api/contratos/${id}`, { method: "DELETE" })
    if (res.ok) {
      setContratos((prev) => prev.filter((c) => c.id !== id))
    }
  }

  async function activarBorradores() {
    if (!confirm("¿Activar todos los contratos en estado borrador?")) return

    setActivando(true)
    try {
      // Activar cada contrato en borrador
      const borradores = contratos.filter(c => c.estado === "borrador")

      for (const contrato of borradores) {
        await fetch(`/api/contratos/${contrato.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: "activo" })
        })
      }

      // Recargar la lista
      const res = await fetch("/api/contratos")
      const data = await res.json()
      setContratos(data)
    } catch (error) {
      alert("Error al activar contratos")
    } finally {
      setActivando(false)
    }
  }

  async function corregirContratos() {
    if (!confirm("¿Corregir los contratos para que los propietarios puedan verlos? Esto actualizará el propietario asociado a cada contrato.")) return

    setCorrigiendo(true)
    try {
      const res = await fetch("/api/admin/corregir-contratos", { method: "POST" })
      const data = await res.json()

      if (res.ok) {
        alert(`✓ ${data.correccionesRealizadas} contratos corregidos`)
        // Recargar la lista
        const res2 = await fetch("/api/contratos")
        const data2 = await res2.json()
        setContratos(data2)
      } else {
        alert("Error: " + data.error)
      }
    } catch (error) {
      alert("Error al corregir contratos")
    } finally {
      setCorrigiendo(false)
    }
  }

  const formatPeso = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
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
    borrador: t.contratos.estados.borrador,
    activo: t.contratos.estados.activo,
    terminado: t.contratos.estados.terminado,
    vencido: t.contratos.estados.vencido,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.contratos.titulo}</h1>
        <div className="flex gap-2">
          {contratos.some(c => c.estado === "borrador") && (
            <Button
              variant="outline"
              onClick={activarBorradores}
              disabled={activando}
            >
              {activando ? "Activando..." : "Activar Borradores"}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={corregirContratos}
              disabled={corrigiendo}
            >
              {corrigiendo ? "Corrigiendo..." : "Corregir Contratos"}
            </Button>
          )}
          <Button asChild>
            <Link href="/contratos/nuevo">{t.contratos.nuevoContrato}</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t.contratos.cargando}</p>
      ) : contratos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.contratos.sinContratos}</CardTitle>
            <CardDescription>
              {t.contratos.sinContratosDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/contratos/nuevo">{t.contratos.nuevoContrato}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contratos.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{c.propiedad?.direccion}</CardTitle>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${estadoColors[c.estado] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {estadoLabels[c.estado] || c.estado}
                  </span>
                </div>
                <CardDescription>
                  {c.arrendatario?.nombre} · {c.propiedad?.ciudad}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t.contratos.inicio}</p>
                    <p className="font-medium">{formatDate(c.fecha_inicio)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.contratos.fin}</p>
                    <p className="font-medium">{formatDate(c.fecha_fin)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">{t.contratos.canonMensual}</p>
                  <p className="text-lg font-semibold">{formatPeso(c.canon_mensual)}</p>
                </div>
              </CardContent>
              <div className="flex gap-2 p-4 pt-0">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/contratos/${c.id}`}>{t.comun.ver}</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/contratos/${c.id}/editar`}>{t.comun.editar}</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleDelete(c.id)}
                >
                  {t.comun.eliminar}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
