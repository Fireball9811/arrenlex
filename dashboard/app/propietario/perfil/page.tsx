"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Pencil, Mail, Phone, MapPin, Building2, Key, Loader2, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function PerfilPropietarioPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    cedula: "",
    celular: "",
    cedula_lugar_expedicion: "",
    direccion: "",
    cuenta_bancaria_1_entidad: "",
    cuenta_bancaria_1_numero: "",
    cuenta_bancaria_1_tipo: "ahorros",
    llave_bancaria_1: "",
    cuenta_bancaria_2_entidad: "",
    cuenta_bancaria_2_numero: "",
    cuenta_bancaria_2_tipo: "ahorros",
    llave_bancaria_2: "",
  })

  const [propiedades, setPropiedades] = useState<any[]>([])

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setMessage({ type: "error", text: "No autorizado" })
        return
      }

      // Obtener datos del perfil
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!perfil) {
        setMessage({ type: "error", text: "No se encontró tu perfil" })
        return
      }

      setFormData({
        nombre: perfil.nombre || "",
        email: perfil.email || "",
        cedula: perfil.cedula || "",
        celular: perfil.celular || "",
        cedula_lugar_expedicion: perfil.cedula_lugar_expedicion || "",
        direccion: perfil.direccion || "",
        cuenta_bancaria_1_entidad: perfil.cuenta_bancaria_1_entidad || "",
        cuenta_bancaria_1_numero: perfil.cuenta_bancaria_1_numero || "",
        cuenta_bancaria_1_tipo: perfil.cuenta_bancaria_1_tipo || "ahorros",
        llave_bancaria_1: perfil.llave_bancaria_1 || "",
        cuenta_bancaria_2_entidad: perfil.cuenta_bancaria_2_entidad || "",
        cuenta_bancaria_2_numero: perfil.cuenta_bancaria_2_numero || "",
        cuenta_bancaria_2_tipo: perfil.cuenta_bancaria_2_tipo || "ahorros",
        llave_bancaria_2: perfil.llave_bancaria_2 || "",
      })

      // Obtener propiedades del propietario
      const { data: props } = await supabase
        .from("propiedades")
        .select("id, direccion, ciudad, barrio, estado")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      setPropiedades(props || [])
    } catch (error) {
      console.error("Error cargando datos:", error)
      setMessage({ type: "error", text: "Error al cargar tus datos" })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setMessage({ type: "error", text: "No autorizado" })
        return
      }

      // Actualizar datos personales
      const { error: errorPerfil } = await supabase
        .from("perfiles")
        .update({
          nombre: formData.nombre || null,
          celular: formData.celular || null,
          cedula: formData.cedula || null,
          cedula_lugar_expedicion: formData.cedula_lugar_expedicion || null,
          direccion: formData.direccion || null,
        })
        .eq("id", user.id)

      if (errorPerfil) {
        throw new Error(errorPerfil.message)
      }

      // Actualizar datos bancarios
      const { error: errorBancarios } = await supabase
        .from("perfiles")
        .update({
          cuenta_bancaria_1_entidad: formData.cuenta_bancaria_1_entidad || null,
          cuenta_bancaria_1_numero: formData.cuenta_bancaria_1_numero || null,
          cuenta_bancaria_1_tipo: formData.cuenta_bancaria_1_tipo || null,
          llave_bancaria_1: formData.llave_bancaria_1 || null,
          cuenta_bancaria_2_entidad: formData.cuenta_bancaria_2_entidad || null,
          cuenta_bancaria_2_numero: formData.cuenta_bancaria_2_numero || null,
          cuenta_bancaria_2_tipo: formData.cuenta_bancaria_2_tipo || null,
          llave_bancaria_2: formData.llave_bancaria_2 || null,
        })
        .eq("id", user.id)

      if (errorBancarios) {
        throw new Error(errorBancarios.message)
      }

      setMessage({ type: "success", text: "Datos actualizados correctamente" })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Error al guardar" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Mi Perfil</h2>
        <p className="text-muted-foreground">Gestiona tu información personal y datos bancarios</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === "success"
            ? "bg-green-50 text-green-800"
            : "bg-red-50 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Correo electrónico</Label>
              <Input type="email" disabled value={formData.email} className="bg-muted" />
            </div>
            <div>
              <Label>Nombre completo *</Label>
              <Input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div>
              <Label>Cédula</Label>
              <Input
                type="text"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
              />
            </div>
            <div>
              <Label>Celular</Label>
              <Input
                type="text"
                value={formData.celular}
                onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <Input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Tu dirección de residencia"
              />
            </div>
          </CardContent>
        </Card>

        {/* Datos Bancarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos Bancarios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Banco 1</Label>
                <Input
                  type="text"
                  value={formData.cuenta_bancaria_1_entidad}
                  onChange={(e) => setFormData({ ...formData, cuenta_bancaria_1_entidad: e.target.value })}
                  placeholder="Ej: Bancolombia, Nequi, Davivienda"
                />
              </div>
              <div>
                <Label>Tipo de cuenta 1</Label>
                <select
                  value={formData.cuenta_bancaria_1_tipo}
                  onChange={(e) => setFormData({ ...formData, cuenta_bancaria_1_tipo: e.target.value as "ahorros" | "corriente" })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ahorros">Ahorros</option>
                  <option value="corriente">Corriente</option>
                </select>
              </div>
              <div>
                <Label>Número de cuenta 1</Label>
                <Input
                  type="text"
                  value={formData.cuenta_bancaria_1_numero}
                  onChange={(e) => setFormData({ ...formData, cuenta_bancaria_1_numero: e.target.value })}
                />
              </div>
              <div>
                <Label>Llave bancaria 1</Label>
                <Input
                  type="text"
                  value={formData.llave_bancaria_1}
                  onChange={(e) => setFormData({ ...formData, llave_bancaria_1: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Banco 2</Label>
                <Input
                  type="text"
                  value={formData.cuenta_bancaria_2_entidad}
                  onChange={(e) => setFormData({ ...formData, cuenta_bancaria_2_entidad: e.target.value })}
                  placeholder="Ej: Bancolombia, Nequi, Davivienda"
                />
              </div>
              <div>
                <Label>Tipo de cuenta 2</Label>
                <select
                  value={formData.cuenta_bancaria_2_tipo}
                  onChange={(e) => setFormData({ ...formData, cuenta_bancaria_2_tipo: e.target.value as "ahorros" | "corriente" })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ahorros">Ahorros</option>
                  <option value="corriente">Corriente</option>
                </select>
              </div>
              <div>
                <Label>Número de cuenta 2</Label>
                <Input
                  type="text"
                  value={formData.cuenta_bancaria_2_numero}
                  onChange={(e) => setFormData({ ...formData, cuenta_bancaria_2_numero: e.target.value })}
                />
              </div>
              <div>
                <Label>Llave bancaria 2</Label>
                <Input
                  type="text"
                  value={formData.llave_bancaria_2}
                  onChange={(e) => setFormData({ ...formData, llave_bancaria_2: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mis Propiedades */}
        {propiedades.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Mis Propiedades
                <span className="text-sm font-normal text-muted-foreground">
                  ({propiedades.length} propiedad{propiedades.length !== 1 ? "es" : ""})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {propiedades.map((prop) => (
                  <div key={prop.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{prop.direccion}</p>
                        <p className="text-sm text-muted-foreground">{prop.ciudad} · {prop.barrio}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      prop.estado === "disponible" ? "bg-green-100 text-green-800" :
                      prop.estado === "arrendado" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {prop.estado === "disponible" ? "Disponible" :
                       prop.estado === "arrendado" ? "Arrendado" :
                       prop.estado}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botones */}
        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
