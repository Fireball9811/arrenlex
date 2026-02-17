"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
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
import { GaleríaImagenes as GaleriaImagenes } from "@/components/propiedades/galeria-imagenes"
import type { PropiedadImagen } from "@/lib/types/database"
import { CIUDADES_COLOMBIA } from "@/lib/ciudades-colombia"
import type { UserRole } from "@/lib/auth/role"

type PerfilOption = { id: string; email: string; nombre?: string | null; role: string }

const TIPOS = ["apartamento", "casa", "local", "oficina", "habitación"]
const ESTADOS = ["disponible", "arrendado", "mantenimiento"]

export default function EditarPropiedadPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imagenes, setImagenes] = useState<PropiedadImagen[]>([])
  const [role, setRole] = useState<UserRole | null>(null)
  const [propietarios, setPropietarios] = useState<PerfilOption[]>([])
  const [user_id, setUser_id] = useState<string>("")

  const [form, setForm] = useState({
    direccion: "",
    ciudad: "",
    barrio: "",
    tipo: "apartamento",
    habitaciones: "",
    banos: "",
    area: "",
    valor_arriendo: "",
    descripcion: "",
    estado: "disponible",
    matricula_inmobiliaria: "",
    cuenta_bancaria_entidad: "",
    cuenta_bancaria_tipo: "",
    cuenta_bancaria_numero: "",
    cuenta_bancaria_titular: "",
  })

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: UserRole } | null) => {
        if (data?.role) setRole(data.role)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (role !== "admin") return
    fetch("/api/admin/usuarios")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: PerfilOption[]) => {
        const only = (list ?? []).filter((u) => u.role === "propietario")
        setPropietarios(only)
      })
      .catch(() => setPropietarios([]))
  }, [role])

  // Cargar datos de la propiedad
  useEffect(() => {
    Promise.all([
      fetch(`/api/propiedades/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Propiedad no encontrada")
          return res.json()
        }),
      fetch(`/api/propiedades/${id}/imagenes`)
        .then((res) => res.json())
        .catch(() => []),
    ])
      .then(([propData, imgData]) => {
        setForm({
          direccion: propData.direccion ?? "",
          ciudad: propData.ciudad ?? "",
          barrio: propData.barrio ?? "",
          tipo: propData.tipo ?? "apartamento",
          habitaciones: String(propData.habitaciones ?? ""),
          banos: String(propData.banos ?? ""),
          area: String(propData.area ?? ""),
          valor_arriendo: String(propData.valor_arriendo ?? ""),
          descripcion: propData.descripcion ?? "",
          estado: propData.estado ?? "disponible",
          matricula_inmobiliaria: propData.matricula_inmobiliaria ?? "",
          cuenta_bancaria_entidad: propData.cuenta_bancaria_entidad ?? "",
          cuenta_bancaria_tipo: propData.cuenta_bancaria_tipo ?? "",
          cuenta_bancaria_numero: propData.cuenta_bancaria_numero ?? "",
          cuenta_bancaria_titular: propData.cuenta_bancaria_titular ?? "",
        })
        setUser_id(propData.user_id ?? "")
        setImagenes(imgData)
      })
      .catch(() => setError("Propiedad no encontrada"))
      .finally(() => setLoadingData(false))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        direccion: form.direccion ?? "",
        ciudad: form.ciudad ?? "",
        barrio: form.barrio ?? "",
        tipo: form.tipo ?? "apartamento",
        habitaciones: Number(form.habitaciones) || 0,
        banos: Number(form.banos) || 0,
        area: Number(form.area) || 0,
        valorArriendo: Number(form.valor_arriendo) || 0,
        descripcion: form.descripcion ?? "",
        estado: form.estado ?? "disponible",
        matricula_inmobiliaria: form.matricula_inmobiliaria,
        cuentaBancariaEntidad: form.cuenta_bancaria_entidad,
        cuentaBancariaTipo: form.cuenta_bancaria_tipo,
        cuentaBancariaNumero: form.cuenta_bancaria_numero,
        cuentaBancariaTitular: form.cuenta_bancaria_titular,
      }
      if (role === "admin" && user_id) body.user_id = user_id

      const res = await fetch(`/api/propiedades/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Error al actualizar")

      router.push("/propiedades")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <p className="text-muted-foreground">Cargando propiedad...</p>
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-3xl font-bold">Editar Propiedad</h1>
        <Button variant="outline" asChild>
          <Link href="/propiedades">Volver</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulario de datos */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Datos de la Propiedad</CardTitle>
                <CardDescription>Modifica la información del inmueble</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {role === "admin" && (
                  <div className="sm:col-span-2">
                    <label htmlFor="propietario" className="mb-1 block text-sm font-medium">
                      Propietario
                    </label>
                    <select
                      id="propietario"
                      value={user_id}
                      onChange={(e) => setUser_id(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">Seleccionar propietario...</option>
                      {propietarios.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre ? `${p.nombre} (${p.email})` : p.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label htmlFor="direccion" className="mb-1 block text-sm font-medium">
                    Dirección
                  </label>
                  <Input
                    id="direccion"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="ciudad" className="mb-1 block text-sm font-medium">Ciudad</label>
                  <Input
                    id="ciudad"
                    list="ciudades-colombia-editar"
                    value={form.ciudad}
                    onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                    placeholder="Ej: Bogotá, Girardot..."
                    required
                  />
                  <datalist id="ciudades-colombia-editar">
                    {CIUDADES_COLOMBIA.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="barrio" className="mb-1 block text-sm font-medium">Barrio</label>
                  <Input
                    id="barrio"
                    value={form.barrio}
                    onChange={(e) => setForm({ ...form, barrio: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="tipo" className="mb-1 block text-sm font-medium">Tipo</label>
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
                  <label htmlFor="habitaciones" className="mb-1 block text-sm font-medium">Habitaciones</label>
                  <Input
                    id="habitaciones"
                    type="number"
                    min={0}
                    value={form.habitaciones}
                    onChange={(e) => setForm({ ...form, habitaciones: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="banos" className="mb-1 block text-sm font-medium">Baños</label>
                  <Input
                    id="banos"
                    type="number"
                    min={0}
                    value={form.banos}
                    onChange={(e) => setForm({ ...form, banos: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="area" className="mb-1 block text-sm font-medium">Área (m²)</label>
                  <Input
                    id="area"
                    type="number"
                    min={0}
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="valor_arriendo" className="mb-1 block text-sm font-medium">Valor arriendo (COP)</label>
                  <Input
                    id="valor_arriendo"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.valor_arriendo}
                    onChange={(e) => setForm({ ...form, valor_arriendo: e.target.value })}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="descripcion" className="mb-1 block text-sm font-medium">Descripción</label>
                  <textarea
                    id="descripcion"
                    rows={3}
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="estado" className="mb-1 block text-sm font-medium">Estado</label>
                  <select
                    id="estado"
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    {ESTADOS.map((est) => (
                      <option key={est} value={est}>
                        {est.charAt(0).toUpperCase() + est.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">Información del contrato</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="matricula_inmobiliaria" className="mb-1 block text-sm font-medium">
                        Matrícula inmobiliaria
                      </label>
                      <Input
                        id="matricula_inmobiliaria"
                        value={form.matricula_inmobiliaria}
                        onChange={(e) => setForm({ ...form, matricula_inmobiliaria: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="cuenta_bancaria_entidad" className="mb-1 block text-sm font-medium">
                        Entidad bancaria
                      </label>
                      <Input
                        id="cuenta_bancaria_entidad"
                        value={form.cuenta_bancaria_entidad}
                        onChange={(e) => setForm({ ...form, cuenta_bancaria_entidad: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="cuenta_bancaria_tipo" className="mb-1 block text-sm font-medium">
                        Tipo de cuenta
                      </label>
                      <select
                        id="cuenta_bancaria_tipo"
                        value={form.cuenta_bancaria_tipo}
                        onChange={(e) => setForm({ ...form, cuenta_bancaria_tipo: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="ahorros">Ahorros</option>
                        <option value="corriente">Corriente</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="cuenta_bancaria_numero" className="mb-1 block text-sm font-medium">
                        Número de cuenta
                      </label>
                      <Input
                        id="cuenta_bancaria_numero"
                        value={form.cuenta_bancaria_numero}
                        onChange={(e) => setForm({ ...form, cuenta_bancaria_numero: e.target.value })}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="cuenta_bancaria_titular" className="mb-1 block text-sm font-medium">
                        Titular de la cuenta
                      </label>
                      <Input
                        id="cuenta_bancaria_titular"
                        value={form.cuenta_bancaria_titular}
                        onChange={(e) => setForm({ ...form, cuenta_bancaria_titular: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive sm:col-span-2">{error}</p>
                )}
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/propiedades">Cancelar</Link>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Sección de gestión de fotos */}
        <div>
          <GaleriaImagenes
            propiedadId={id}
            imagenes={imagenes}
            onImagenesChange={setImagenes}
            readonly={loading}
          />
        </div>
      </div>
    </div>
  )
}
