"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLang } from "@/lib/i18n/context"

type PropiedadOption = { id: string; direccion: string; ciudad: string; barrio: string }

export default function InquilinoMantenimientoPage() {
  const { t } = useLang()
  const [propiedades, setPropiedades] = useState<PropiedadOption[]>([])
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [detalle, setDetalle] = useState("")
  const [desdeCuando, setDesdeCuando] = useState("")
  const [propiedadId, setPropiedadId] = useState("")
  const [formLoading, setFormLoading] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const todayStr = new Date().toISOString().split("T")[0]

  useEffect(() => {
    fetch("/api/mantenimiento/propiedades-inquilino")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PropiedadOption[]) => {
        setPropiedades(Array.isArray(data) ? data : [])
        if (data?.length === 1) setPropiedadId(data[0].id)
      })
      .catch(() => setPropiedades([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormMessage(null)
    try {
      const body: Record<string, string> = {
        nombre_completo: nombreCompleto.trim(),
        detalle: detalle.trim(),
        desde_cuando: desdeCuando.trim(),
      }
      if (propiedades.length > 1 && propiedadId) {
        body.propiedad_id = propiedadId
      }
      const res = await fetch("/api/mantenimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setFormMessage({ type: "success", text: data.message || "Solicitud enviada correctamente" })
        setNombreCompleto("")
        setDetalle("")
        setDesdeCuando("")
        if (propiedades.length > 1) setPropiedadId("")
      } else {
        setFormMessage({ type: "error", text: data.error || "Error al enviar la solicitud" })
      }
    } catch {
      setFormMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.mantenimiento.titulo}</h1>
        <p className="text-muted-foreground">{t.mantenimiento.descripcionInquilino}</p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t.mantenimiento.cardTitulo}</CardTitle>
          <CardDescription>{t.mantenimiento.cardDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t.mantenimiento.nombreCompleto}</label>
              <input
                type="text"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder={t.mantenimiento.placeholderNombre}
              />
            </div>
            {propiedades.length > 1 && (
              <div>
                <label className="mb-1 block text-sm font-medium">{t.mantenimiento.propiedad}</label>
                <select
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={propiedadId}
                  onChange={(e) => setPropiedadId(e.target.value)}
                >
                  <option value="">{t.mantenimiento.seleccionaPropiedad}</option>
                  {propiedades.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.direccion, p.ciudad].filter(Boolean).join(", ")}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">{t.mantenimiento.detalle}</label>
              <textarea
                required
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder={t.mantenimiento.placeholderDetalle}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t.mantenimiento.desdeCuando}</label>
              <input
                type="date"
                required
                max={todayStr}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={desdeCuando}
                onChange={(e) => setDesdeCuando(e.target.value)}
              />
            </div>
            {formMessage && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  formMessage.type === "success"
                    ? "border border-green-200 bg-green-50 text-green-800"
                    : "border border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {formMessage.text}
              </div>
            )}
            <Button type="submit" disabled={formLoading}>
              {formLoading ? t.mantenimiento.enviando : t.mantenimiento.enviar}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
