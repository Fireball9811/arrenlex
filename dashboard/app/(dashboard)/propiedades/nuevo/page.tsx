"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const CIUDADES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"]
const TIPOS = ["apartamento", "casa", "local", "oficina", "habitación"]

export default function NuevaPropiedadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    direccion: "",
    ciudad: "",
    barrio: "",
    tipo: "apartamento",
    habitaciones: "",
    banos: "",
    area: "",
    valorArriendo: "",
    descripcion: "",
    estado: "disponible",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/propiedades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          habitaciones: Number(form.habitaciones) || 0,
          banos: Number(form.banos) || 0,
          area: Number(form.area) || 0,
          valorArriendo: Number(form.valorArriendo) || 0,
        }),
      })

      if (!res.ok) throw new Error("Error al guardar")

      router.push("/propiedades")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Nueva propiedad</h1>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Datos de la propiedad</CardTitle>
            <CardDescription>
              Complete la información del inmueble a arrendar
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="direccion" className="mb-1 block text-sm font-medium">
                Dirección
              </label>
              <Input
                id="direccion"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Ej: Cra 15 #42-18"
                required
              />
            </div>

            <div>
              <label htmlFor="ciudad" className="mb-1 block text-sm font-medium">
                Ciudad
              </label>
              <select
                id="ciudad"
                value={form.ciudad}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                required
              >
                <option value="">Seleccionar...</option>
                {CIUDADES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="barrio" className="mb-1 block text-sm font-medium">
                Barrio
              </label>
              <Input
                id="barrio"
                value={form.barrio}
                onChange={(e) => setForm({ ...form, barrio: e.target.value })}
                placeholder="Ej: Chapinero"
              />
            </div>

            <div>
              <label htmlFor="tipo" className="mb-1 block text-sm font-medium">
                Tipo
              </label>
              <select
                id="tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="habitaciones" className="mb-1 block text-sm font-medium">
                Habitaciones
              </label>
              <Input
                id="habitaciones"
                type="number"
                min={0}
                value={form.habitaciones}
                onChange={(e) => setForm({ ...form, habitaciones: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="banos" className="mb-1 block text-sm font-medium">
                Baños
              </label>
              <Input
                id="banos"
                type="number"
                min={0}
                value={form.banos}
                onChange={(e) => setForm({ ...form, banos: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="area" className="mb-1 block text-sm font-medium">
                Área (m²)
              </label>
              <Input
                id="area"
                type="number"
                min={0}
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="valorArriendo" className="mb-1 block text-sm font-medium">
                Valor arriendo (COP)
              </label>
              <Input
                id="valorArriendo"
                type="number"
                min={0}
                value={form.valorArriendo}
                onChange={(e) => setForm({ ...form, valorArriendo: e.target.value })}
                placeholder="Ej: 1500000"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="descripcion" className="mb-1 block text-sm font-medium">
                Descripción
              </label>
              <textarea
                id="descripcion"
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                placeholder="Descripción del inmueble..."
              />
            </div>

            {error && (
              <p className="text-sm text-destructive sm:col-span-2">{error}</p>
            )}
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/propiedades">Cancelar</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
