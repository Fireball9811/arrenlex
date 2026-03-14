"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, RefreshCw, Building2, Trash2, UserPlus } from "lucide-react"
import type { Perfil } from "@/lib/types/database"
import type { Propiedad } from "@/lib/types/database"

type PerfilCompleto = Perfil & {
  propiedades?: Propiedad[]
}

export default function EditarUsuarioPage() {
  const router = useRouter()
  const params = useParams()
  const usuarioId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<PerfilCompleto | null>(null)
  const [propiedadesDisponibles, setPropiedadesDisponibles] = useState<Propiedad[]>([])
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState("")
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    celular: "",
    cedula: "",
    cedula_lugar_expedicion: "",
    direccion: "",
    activo: true,
    role: "",
    // Cuenta bancaria 1
    cuenta_bancaria_1_entidad: "",
    cuenta_bancaria_1_numero: "",
    cuenta_bancaria_1_tipo: "ahorros",
    // Cuenta bancaria 2
    cuenta_bancaria_2_entidad: "",
    cuenta_bancaria_2_numero: "",
    cuenta_bancaria_2_tipo: "ahorros",
    // Llaves bancarias
    llave_bancaria_1: "",
    llave_bancaria_2: "",
  })

  useEffect(() => {
    fetchUsuario()
  }, [usuarioId])

  async function fetchUsuario() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/usuarios/${usuarioId}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }))
        setError(`Error al cargar usuario: ${errorData.error || res.statusText}`)
        setLoading(false)
        return
      }

      const data: PerfilCompleto = await res.json()
      setUsuario(data)

      // Cargar propiedades del usuario si es propietario
      if (data.role === "propietario") {
        try {
          const resProps = await fetch(`/api/admin/propietarios/${data.id}/propiedades`)
          const propsData: Propiedad[] = await resProps.json()
          setUsuario({ ...data, propiedades: propsData })

          // Cargar propiedades disponibles para asignar
          const resAllProps = await fetch("/api/propiedades")
          const allProps: Propiedad[] = await resAllProps.json()
          const disponibles = allProps.filter((p) => p.user_id !== data.id)
          setPropiedadesDisponibles(disponibles)
        } catch (err) {
          console.error("Error cargando propiedades:", err)
        }
      }

      setFormData({
        nombre: data.nombre || "",
        celular: data.celular || "",
        cedula: data.cedula || "",
        cedula_lugar_expedicion: data.cedula_lugar_expedicion || "",
        direccion: data.direccion || "",
        activo: data.activo,
        role: data.role,
        cuenta_bancaria_1_entidad: data.cuenta_bancaria_1_entidad || "",
        cuenta_bancaria_1_numero: data.cuenta_bancaria_1_numero || "",
        cuenta_bancaria_1_tipo: data.cuenta_bancaria_1_tipo || "ahorros",
        cuenta_bancaria_2_entidad: data.cuenta_bancaria_2_entidad || "",
        cuenta_bancaria_2_numero: data.cuenta_bancaria_2_numero || "",
        cuenta_bancaria_2_tipo: data.cuenta_bancaria_2_tipo || "ahorros",
        llave_bancaria_1: data.llave_bancaria_1 || "",
        llave_bancaria_2: data.llave_bancaria_2 || "",
      })
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : "Error desconocido"}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!usuario) return

    setSaving(true)
    setError(null)

    try {
      // Actualizar datos personales y estado
      await fetch(`/api/admin/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_datos_personales",
          nombre: formData.nombre,
          celular: formData.celular,
          cedula: formData.cedula,
          cedula_lugar_expedicion: formData.cedula_lugar_expedicion,
          direccion: formData.direccion,
          activo: formData.activo,
        }),
      })

      // Actualizar rol
      await fetch(`/api/admin/usuarios/${usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          role: formData.role,
        }),
      })

      // Actualizar datos bancarios
      await fetch(`/api/admin/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_datos_bancarios",
          cuenta_bancaria_1_entidad: formData.cuenta_bancaria_1_entidad || null,
          cuenta_bancaria_1_numero: formData.cuenta_bancaria_1_numero || null,
          cuenta_bancaria_1_tipo: formData.cuenta_bancaria_1_tipo || null,
          cuenta_bancaria_2_entidad: formData.cuenta_bancaria_2_entidad || null,
          cuenta_bancaria_2_numero: formData.cuenta_bancaria_2_numero || null,
          cuenta_bancaria_2_tipo: formData.cuenta_bancaria_2_tipo || null,
          llave_bancaria_1: formData.llave_bancaria_1 || null,
          llave_bancaria_2: formData.llave_bancaria_2 || null,
        }),
      })

      router.push("/reportes/personas?tab=usuarios-sistema")
    } catch (err: any) {
      setError(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function restablecerContrasena() {
    if (!usuario) return

    setResettingPassword(true)
    setResetMessage(null)

    try {
      const res = await fetch(`/api/admin/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "resetear_contrasena" }),
      })

      const data = await res.json()

      if (res.ok) {
        setResetMessage({
          type: "success",
          text: data.message || `Contraseña temporal enviada a ${usuario.email}`,
        })
        setTimeout(() => setResetMessage(null), 4000)
      } else {
        setResetMessage({ type: "error", text: data.error || "Error al enviar contraseña temporal" })
      }
    } catch (err) {
      setResetMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setResettingPassword(false)
    }
  }

  async function asignarPropiedad() {
    if (!usuario || !propiedadSeleccionada) return

    try {
      const res = await fetch(`/api/admin/propietarios/${usuario.id}/propiedades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedadId: propiedadSeleccionada }),
      })

      if (res.ok) {
        const resProps = await fetch(`/api/admin/propietarios/${usuario.id}/propiedades`)
        const data: Propiedad[] = await resProps.json()
        setUsuario({ ...usuario, propiedades: data })

        const resAllProps = await fetch("/api/propiedades")
        const allProps: Propiedad[] = await resAllProps.json()
        const disponibles = allProps.filter((p) => p.user_id !== usuario.id)
        setPropiedadesDisponibles(disponibles)

        setPropiedadSeleccionada("")
      } else {
        const data = await res.json()
        alert(data.error || "Error al asignar propiedad")
      }
    } catch (err) {
      alert("Error: " + err)
    }
  }

  async function quitarPropiedad(propiedadId: string) {
    if (!usuario) return
    if (!confirm("¿Estás seguro de quitar esta propiedad del propietario?")) return

    try {
      const res = await fetch(`/api/admin/propietarios/${usuario.id}/propiedades?propiedadId=${propiedadId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        const resProps = await fetch(`/api/admin/propietarios/${usuario.id}/propiedades`)
        const data: Propiedad[] = await resProps.json()
        setUsuario({ ...usuario, propiedades: data })

        const resAllProps = await fetch("/api/propiedades")
        const allProps: Propiedad[] = await resAllProps.json()
        const disponibles = allProps.filter((p) => p.user_id !== usuario.id)
        setPropiedadesDisponibles(disponibles)
      } else {
        const data = await res.json()
        alert(data.error || "Error al quitar propiedad")
      }
    } catch (err) {
      alert("Error: " + err)
    }
  }

  if (loading) {
    return (
      <div>
        <Link href="/reportes/personas" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes de Personas
        </Link>
        <p className="text-muted-foreground mt-4">Cargando usuario...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Link href="/reportes/personas" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes de Personas
        </Link>
        <Card className="mt-4 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 font-semibold">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div>
        <Link href="/reportes/personas" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes de Personas
        </Link>
        <Card className="mt-4 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-600 font-semibold">Usuario no encontrado</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reportes/personas">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Editar Usuario</h1>
            <p className="text-muted-foreground">Información completa del usuario</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>Correo electrónico y rol del usuario</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Correo electrónico</Label>
                  <Input
                    type="email"
                    disabled
                    value={usuario.email}
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">El correo no se puede modificar</p>
                </div>
                <div>
                  <Label>Rol *</Label>
                  <select
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="admin">Administrador</option>
                    <option value="propietario">Propietario</option>
                    <option value="inquilino">Inquilino</option>
                    <option value="maintenance_special">Mantenimiento (Especial)</option>
                    <option value="insurance_special">Seguros (Especial)</option>
                    <option value="lawyer_special">Legal (Especial)</option>
                  </select>
                </div>
              </div>

              {resetMessage && (
                <div className={`mt-4 p-3 rounded-lg ${
                  resetMessage.type === "success"
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  <span className="text-sm">{resetMessage.text}</span>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={restablecerContrasena}
                  disabled={resettingPassword}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {resettingPassword ? "Enviando..." : "Restablecer contraseña"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Datos personales */}
          <Card>
            <CardHeader>
              <CardTitle>Datos Personales</CardTitle>
              <CardDescription>Información personal del usuario</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nombre completo *</Label>
                  <Input
                    type="text"
                    placeholder="Juan Pérez García"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Cédula</Label>
                  <Input
                    type="text"
                    placeholder="123456789"
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Lugar de expedición</Label>
                  <Input
                    type="text"
                    placeholder="Bogotá D.C."
                    value={formData.cedula_lugar_expedicion}
                    onChange={(e) => setFormData({ ...formData, cedula_lugar_expedicion: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Celular</Label>
                  <Input
                    type="text"
                    placeholder="+57 300 123 4567"
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Dirección</Label>
                  <Input
                    type="text"
                    placeholder="Calle 123 # 45-67"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <Label htmlFor="activo">Usuario activo</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cuentas bancarias */}
          <Card>
            <CardHeader>
              <CardTitle>Cuentas Bancarias</CardTitle>
              <CardDescription>Información bancaria del usuario</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Cuenta 1 */}
                <div className="border rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Cuenta Bancaria 1</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label className="text-sm">Entidad</Label>
                      <Input
                        type="text"
                        placeholder="Bancolombia"
                        value={formData.cuenta_bancaria_1_entidad}
                        onChange={(e) => setFormData({ ...formData, cuenta_bancaria_1_entidad: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Número</Label>
                      <Input
                        type="text"
                        placeholder="123-456-789"
                        value={formData.cuenta_bancaria_1_numero}
                        onChange={(e) => setFormData({ ...formData, cuenta_bancaria_1_numero: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Tipo</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.cuenta_bancaria_1_tipo}
                        onChange={(e) => setFormData({ ...formData, cuenta_bancaria_1_tipo: e.target.value })}
                      >
                        <option value="ahorros">Ahorros</option>
                        <option value="corriente">Corriente</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Cuenta 2 */}
                <div className="border rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Cuenta Bancaria 2</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label className="text-sm">Entidad</Label>
                      <Input
                        type="text"
                        placeholder="Bancolombia"
                        value={formData.cuenta_bancaria_2_entidad}
                        onChange={(e) => setFormData({ ...formData, cuenta_bancaria_2_entidad: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Número</Label>
                      <Input
                        type="text"
                        placeholder="123-456-789"
                        value={formData.cuenta_bancaria_2_numero}
                        onChange={(e) => setFormData({ ...formData, cuenta_bancaria_2_numero: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Tipo</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.cuenta_bancaria_2_tipo}
                        onChange={(e) => setFormData({ ...formData, cuenta_bancaria_2_tipo: e.target.value })}
                      >
                        <option value="ahorros">Ahorros</option>
                        <option value="corriente">Corriente</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Llaves bancarias */}
          <Card>
            <CardHeader>
              <CardTitle>Llaves Bancarias (Colombia)</CardTitle>
              <CardDescription>Claves para transferencias bancarias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Llave bancaria 1</Label>
                  <Input
                    type="text"
                    placeholder="ABC123DEF456"
                    value={formData.llave_bancaria_1}
                    onChange={(e) => setFormData({ ...formData, llave_bancaria_1: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Máximo 20 caracteres</p>
                </div>
                <div>
                  <Label>Llave bancaria 2</Label>
                  <Input
                    type="text"
                    placeholder="GHI789JKL012"
                    value={formData.llave_bancaria_2}
                    onChange={(e) => setFormData({ ...formData, llave_bancaria_2: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Máximo 20 caracteres</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Propiedades (solo para propietarios) */}
          {formData.role === "propietario" && (
            <Card>
              <CardHeader>
                <CardTitle>Propiedades Asignadas</CardTitle>
                <CardDescription>Gestiona las propiedades de este propietario</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Lista de propiedades actuales */}
                <div className="mb-4">
                  {usuario.propiedades && usuario.propiedades.length > 0 ? (
                    <div className="space-y-2">
                      {usuario.propiedades.map((prop) => (
                        <div key={prop.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <p className="font-medium">{prop.direccion}</p>
                            <p className="text-xs text-muted-foreground">{prop.ciudad} • {prop.barrio}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => quitarPropiedad(prop.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Este propietario no tiene propiedades asignadas</p>
                  )}
                </div>

                {/* Asignar nueva propiedad */}
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={propiedadSeleccionada}
                    onChange={(e) => setPropiedadSeleccionada(e.target.value)}
                  >
                    <option value="">Seleccionar propiedad para asignar...</option>
                    {propiedadesDisponibles.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.direccion} - {prop.ciudad}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={asignarPropiedad}
                    disabled={!propiedadSeleccionada}
                  >
                    <Building2 className="h-4 w-4 mr-1" />
                    Asignar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
            <Link href="/reportes/personas" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancelar
              </Button>
            </Link>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600 font-semibold">{error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </form>
    </div>
  )
}
