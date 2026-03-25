"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save, User } from "lucide-react"

interface PerfilData {
  id: string
  nombre: string
  cedula: string
  cedula_lugar_expedicion: string
  celular: string
  direccion: string
  email: string
  role: string
}

export default function PerfilPropietarioPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null)

  const [nombre, setNombre] = useState("")
  const [cedula, setCedula] = useState("")
  const [cedulaLugar, setCedulaLugar] = useState("")
  const [celular, setCelular] = useState("")
  const [direccion, setDireccion] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (me: { id?: string; email?: string; role?: string } | null) => {
        if (!me?.id) {
          setLoading(false)
          return
        }
        setUserId(me.id)
        setEmail(me.email || "")

        const res = await fetch(`/api/perfiles/${me.id}`)
        if (res.ok) {
          const data: PerfilData = await res.json()
          setNombre(data.nombre || "")
          setCedula(data.cedula || "")
          setCedulaLugar(data.cedula_lugar_expedicion || "")
          setCelular(data.celular || "")
          setDireccion(data.direccion || "")
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setMensaje(null)
    try {
      const res = await fetch(`/api/perfiles/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          cedula: cedula.trim(),
          cedula_lugar_expedicion: cedulaLugar.trim(),
          celular: celular.trim(),
          direccion: direccion.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setMensaje({ tipo: "success", texto: "Perfil actualizado correctamente" })
    } catch (err: unknown) {
      setMensaje({
        tipo: "error",
        texto: `Error al guardar: ${err instanceof Error ? err.message : "Error desconocido"}`,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>
  }

  return (
    <div suppressHydrationWarning>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">Actualiza tus datos personales</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <CardTitle>Datos Personales</CardTitle>
                <CardDescription>{email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre completo</label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Cédula de ciudadanía</label>
                <Input
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: 1234567890"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Lugar de expedición</label>
                <Input
                  value={cedulaLugar}
                  onChange={(e) => setCedulaLugar(e.target.value)}
                  placeholder="Ej: Medellín"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Celular</label>
              <Input
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="Ej: 3001234567"
                inputMode="tel"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Dirección de residencia</label>
              <Input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Calle 10 # 20-30, Medellín"
              />
            </div>

            {mensaje && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  mensaje.tipo === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {mensaje.texto}
              </div>
            )}

            <Button type="submit" disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
