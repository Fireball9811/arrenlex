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

type PerfilOption = { id: string; email: string; nombre?: string | null; role: string }

const TIPOS = ["apartamento", "casa", "local", "oficina", "habitación"]
const ESTADOS = ["disponible", "arrendado", "mantenimiento"]

export default function AdminEditarPropiedadPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imagenes, setImagenes] = useState<PropiedadImagen[]>([])
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
    ascensor: "",
    depositos: "",
    parqueaderos: "",
    valor_arriendo: "",
    descripcion: "",
    estado: "disponible",
    matricula_inmobiliaria: "",
    cuenta_bancaria_entidad: "",
    cuenta_bancaria_tipo: "",
    cuenta_bancaria_numero: "",
    cuenta_bancaria_titular: "",
    notificaciones_email: false,
  })

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: PerfilOption[]) => setPropietarios((list ?? []).filter((u) => u.role === "propietario")))
      .catch(() => setPropietarios([]))
  }, [])

  useEffect(() => {
    Promise.all([
      fetch(`/api/propiedades/${id}`).then((res) => { if (!res.ok) throw new Error("Propiedad no encontrada"); return res.json() }),
      fetch(`/api/propiedades/${id}/imagenes`).then((res) => res.json()).catch(() => []),
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
          ascensor: String(propData.ascensor ?? ""),
          depositos: String(propData.depositos ?? ""),
          parqueaderos: String(propData.parqueaderos ?? ""),
          valor_arriendo: String(propData.valor_arriendo ?? ""),
          descripcion: propData.descripcion ?? "",
          estado: propData.estado ?? "disponible",
          matricula_inmobiliaria: propData.matricula_inmobiliaria ?? "",
          cuenta_bancaria_entidad: propData.cuenta_bancaria_entidad ?? "",
          cuenta_bancaria_tipo: propData.cuenta_bancaria_tipo ?? "",
          cuenta_bancaria_numero: propData.cuenta_bancaria_numero ?? "",
          cuenta_bancaria_titular: propData.cuenta_bancaria_titular ?? "",
          notificaciones_email: propData.notificaciones_email ?? false,
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
      const res = await fetch(`/api/propiedades/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direccion: form.direccion,
          ciudad: form.ciudad,
          barrio: form.barrio,
          tipo: form.tipo,
          habitaciones: Number(form.habitaciones) || 0,
          banos: Number(form.banos) || 0,
          area: Number(form.area) || 0,
          ascensor: Number(form.ascensor) || 0,
          depositos: Number(form.depositos) || 0,
          parqueaderos: Number(form.parqueaderos) || 0,
          valorArriendo: Number(form.valor_arriendo) || 0,
          descripcion: form.descripcion,
          estado: form.estado,
          matricula_inmobiliaria: form.matricula_inmobiliaria,
          cuentaBancariaEntidad: form.cuenta_bancaria_entidad,
          cuentaBancariaTipo: form.cuenta_bancaria_tipo,
          cuentaBancariaNumero: form.cuenta_bancaria_numero,
          cuentaBancariaTitular: form.cuenta_bancaria_titular,
          notificaciones_email: form.notificaciones_email,
          user_id: user_id || undefined,
        }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      router.push("/admin/propiedades")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) return <p className="text-muted-foreground">Cargando propiedad...</p>

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-3xl font-bold">Editar Propiedad</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/propiedades">Volver</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Datos de la Propiedad</CardTitle>
                <CardDescription>Modifica la información del inmueble</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="propietario" className="mb-1 block text-sm font-medium">Propietario</label>
                  <select id="propietario" value={user_id} onChange={(e) => setUser_id(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="">Seleccionar propietario...</option>
                    {propietarios.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre ? `${p.nombre} (${p.email})` : p.email}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="direccion" className="mb-1 block text-sm font-medium">Dirección</label>
                  <Input id="direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} required />
                </div>

                <div>
                  <label htmlFor="ciudad" className="mb-1 block text-sm font-medium">Ciudad</label>
                  <Input id="ciudad" list="ciudades-colombia-admin-editar" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} required />
                  <datalist id="ciudades-colombia-admin-editar">
                    {CIUDADES_COLOMBIA.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="barrio" className="mb-1 block text-sm font-medium">Barrio</label>
                  <Input id="barrio" value={form.barrio} onChange={(e) => setForm({ ...form, barrio: e.target.value })} />
                </div>

                <div>
                  <label htmlFor="tipo" className="mb-1 block text-sm font-medium">Tipo</label>
                  <select id="tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    {TIPOS.map((tp) => <option key={tp} value={tp}>{tp.charAt(0).toUpperCase() + tp.slice(1)}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="habitaciones" className="mb-1 block text-sm font-medium">Habitaciones</label>
                  <Input id="habitaciones" type="number" min={0} value={form.habitaciones} onChange={(e) => setForm({ ...form, habitaciones: e.target.value })} />
                </div>

                <div>
                  <label htmlFor="banos" className="mb-1 block text-sm font-medium">Baños</label>
                  <Input id="banos" type="number" min={0} value={form.banos} onChange={(e) => setForm({ ...form, banos: e.target.value })} />
                </div>

                <div>
                  <label htmlFor="area" className="mb-1 block text-sm font-medium">Área (m²)</label>
                  <Input id="area" type="number" min={0} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                </div>

                <div>
                  <label htmlFor="ascensor" className="mb-1 block text-sm font-medium">Ascensores</label>
                  <Input id="ascensor" type="number" min={0} value={form.ascensor} onChange={(e) => setForm({ ...form, ascensor: e.target.value })} placeholder="0" />
                </div>

                <div>
                  <label htmlFor="depositos" className="mb-1 block text-sm font-medium">Depósitos</label>
                  <Input id="depositos" type="number" min={0} value={form.depositos} onChange={(e) => setForm({ ...form, depositos: e.target.value })} placeholder="0" />
                </div>

                <div>
                  <label htmlFor="parqueaderos" className="mb-1 block text-sm font-medium">Parqueaderos</label>
                  <Input id="parqueaderos" type="number" min={0} value={form.parqueaderos} onChange={(e) => setForm({ ...form, parqueaderos: e.target.value })} placeholder="0" />
                </div>

                <div>
                  <label htmlFor="valor_arriendo" className="mb-1 block text-sm font-medium">Valor arriendo (COP)</label>
                  <Input id="valor_arriendo" type="number" min={0} step={0.01} value={form.valor_arriendo} onChange={(e) => setForm({ ...form, valor_arriendo: e.target.value })} required />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="descripcion" className="mb-1 block text-sm font-medium">Descripción</label>
                  <textarea id="descripcion" rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
                </div>

                <div>
                  <label htmlFor="estado" className="mb-1 block text-sm font-medium">Estado</label>
                  <select id="estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    {ESTADOS.map((est) => <option key={est} value={est}>{est.charAt(0).toUpperCase() + est.slice(1)}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">Información del contrato</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="matricula" className="mb-1 block text-sm font-medium">Matrícula inmobiliaria</label>
                      <Input id="matricula" value={form.matricula_inmobiliaria} onChange={(e) => setForm({ ...form, matricula_inmobiliaria: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="entidad" className="mb-1 block text-sm font-medium">Entidad bancaria</label>
                      <Input id="entidad" value={form.cuenta_bancaria_entidad} onChange={(e) => setForm({ ...form, cuenta_bancaria_entidad: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="tipo_cuenta" className="mb-1 block text-sm font-medium">Tipo de cuenta</label>
                      <select id="tipo_cuenta" value={form.cuenta_bancaria_tipo} onChange={(e) => setForm({ ...form, cuenta_bancaria_tipo: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                        <option value="">Seleccionar...</option>
                        <option value="ahorros">Ahorros</option>
                        <option value="corriente">Corriente</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="num_cuenta" className="mb-1 block text-sm font-medium">Número de cuenta</label>
                      <Input id="num_cuenta" value={form.cuenta_bancaria_numero} onChange={(e) => setForm({ ...form, cuenta_bancaria_numero: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="titular" className="mb-1 block text-sm font-medium">Titular de la cuenta</label>
                      <Input id="titular" value={form.cuenta_bancaria_titular} onChange={(e) => setForm({ ...form, cuenta_bancaria_titular: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 border-t pt-4">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer" checked={form.notificaciones_email} onChange={(e) => setForm({ ...form, notificaciones_email: e.target.checked })} />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">Notificaciones por correo</span>
                      <p className="text-xs text-muted-foreground">Envía recordatorios automáticos de vencimiento de contrato</p>
                    </div>
                  </label>
                </div>

                {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"}</Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/propiedades">Cancelar</Link>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
        <div>
          <GaleriaImagenes propiedadId={id} imagenes={imagenes} onImagenesChange={setImagenes} readonly={loading} />
        </div>
      </div>
    </div>
  )
}
