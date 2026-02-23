"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Pencil, Building2, Trash2, CheckCircle, XCircle } from "lucide-react"
import type { Perfil } from "@/lib/types/database"
import type { Propiedad } from "@/lib/types/database"

interface PropietarioConPropiedades extends Perfil {
  propiedades?: Propiedad[]
  propiedades_count?: number
}

export function PropietariosTab() {
  const [propietarios, setPropietarios] = useState<PropietarioConPropiedades[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Modal de edición
  const [editingPropietario, setEditingPropietario] = useState<PropietarioConPropiedades | null>(null)
  const [editFormData, setEditFormData] = useState({
    nombre: "",
    celular: "",
    cedula: "",
    cedula_lugar_expedicion: "",
    direccion: "",
    activo: true,
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
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editMessage, setEditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Propiedades disponibles para asignar
  const [propiedadesDisponibles, setPropiedadesDisponibles] = useState<Propiedad[]>([])
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState("")

  useEffect(() => {
    fetchPropietarios()
  }, [])

  async function fetchPropietarios() {
    setLoading(true)
    try {
      // Obtener propietarios
      const res = await fetch("/api/admin/usuarios")
      const data = await res.json()
      const soloPropietarios = (data || []).filter((u: Perfil) => u.role === "propietario")

      // Obtener todas las propiedades
      const resProps = await fetch("/api/propiedades")
      const todasProps: Propiedad[] = await resProps.json()

      // Crear un mapa de conteo de propiedades por user_id
      const propsMap = new Map<string, number>()
      for (const prop of todasProps) {
        const count = propsMap.get(prop.user_id) || 0
        propsMap.set(prop.user_id, count + 1)
      }

      // Agregar el conteo de propiedades a cada propietario
      const propietariosConProps = soloPropietarios.map((p: Perfil) => ({
        ...p,
        propiedades_count: propsMap.get(p.id) || 0,
      }))

      setPropietarios(propietariosConProps)
    } catch (error) {
      console.error("Error fetching propietarios:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPropiedadesDisponibles() {
    try {
      // Obtener todas las propiedades
      const res = await fetch("/api/propiedades")
      const data: Propiedad[] = await res.json()

      // Obtener IDs de todos los propietarios activos
      const propietariosIds = propietarios.map((p) => p.id)

      // FILTRAR: Solo propiedades SIN propietario
      // Una propiedad está "sin propietario" cuando su user_id NO corresponde a un usuario con rol "propietario"
      const disponibles = data.filter((p) => !propietariosIds.includes(p.user_id))

      setPropiedadesDisponibles(disponibles)
    } catch (error) {
      console.error("Error fetching propiedades:", error)
    }
  }

  async function openEditModal(propietario: PropietarioConPropiedades) {
    setEditingPropietario(propietario)
    setEditFormData({
      nombre: propietario.nombre || "",
      celular: propietario.celular || "",
      cedula: propietario.cedula || "",
      cedula_lugar_expedicion: propietario.cedula_lugar_expedicion || "",
      direccion: propietario.direccion || "",
      activo: propietario.activo,
      cuenta_bancaria_1_entidad: propietario.cuenta_bancaria_1_entidad || "",
      cuenta_bancaria_1_numero: propietario.cuenta_bancaria_1_numero || "",
      cuenta_bancaria_1_tipo: propietario.cuenta_bancaria_1_tipo || "ahorros",
      cuenta_bancaria_2_entidad: propietario.cuenta_bancaria_2_entidad || "",
      cuenta_bancaria_2_numero: propietario.cuenta_bancaria_2_numero || "",
      cuenta_bancaria_2_tipo: propietario.cuenta_bancaria_2_tipo || "ahorros",
      llave_bancaria_1: propietario.llave_bancaria_1 || "",
      llave_bancaria_2: propietario.llave_bancaria_2 || "",
    })
    setEditMessage(null)

    // Cargar propiedades del propietario
    try {
      const res = await fetch(`/api/admin/propietarios/${propietario.id}/propiedades`)
      const data: Propiedad[] = await res.json()
      setEditingPropietario({ ...propietario, propiedades: data })
    } catch (error) {
      console.error("Error fetching propiedades del propietario:", error)
    }

    // Cargar propiedades disponibles para asignar
    await fetchPropiedadesDisponibles()
  }

  function closeEditModal() {
    setEditingPropietario(null)
    setEditFormData({
      nombre: "",
      celular: "",
      cedula: "",
      cedula_lugar_expedicion: "",
      direccion: "",
      activo: true,
      cuenta_bancaria_1_entidad: "",
      cuenta_bancaria_1_numero: "",
      cuenta_bancaria_1_tipo: "ahorros",
      cuenta_bancaria_2_entidad: "",
      cuenta_bancaria_2_numero: "",
      cuenta_bancaria_2_tipo: "ahorros",
      llave_bancaria_1: "",
      llave_bancaria_2: "",
    })
    setPropiedadSeleccionada("")
    setEditMessage(null)
  }

  async function actualizarPropietario(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPropietario) return

    setEditSubmitting(true)
    setEditMessage(null)

    try {
      // Datos bancarios a enviar
      const datosBancarios = {
        cuenta_bancaria_1_entidad: editFormData.cuenta_bancaria_1_entidad?.trim() || null,
        cuenta_bancaria_1_numero: editFormData.cuenta_bancaria_1_numero?.trim() || null,
        cuenta_bancaria_1_tipo: editFormData.cuenta_bancaria_1_tipo || null,
        cuenta_bancaria_2_entidad: editFormData.cuenta_bancaria_2_entidad?.trim() || null,
        cuenta_bancaria_2_numero: editFormData.cuenta_bancaria_2_numero?.trim() || null,
        cuenta_bancaria_2_tipo: editFormData.cuenta_bancaria_2_tipo || null,
        llave_bancaria_1: editFormData.llave_bancaria_1?.trim() || null,
        llave_bancaria_2: editFormData.llave_bancaria_2?.trim() || null,
      }

      console.log("[PropietariosTab] Enviando datos bancarios:", datosBancarios)

      // Actualizar datos personales y estado
      await fetch(`/api/admin/usuarios/${editingPropietario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_datos_personales",
          nombre: editFormData.nombre,
          celular: editFormData.celular,
          cedula: editFormData.cedula,
          cedula_lugar_expedicion: editFormData.cedula_lugar_expedicion,
          direccion: editFormData.direccion,
          activo: editFormData.activo,
        }),
      })

      // Actualizar datos bancarios
      const resBancarios = await fetch(`/api/admin/usuarios/${editingPropietario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_datos_bancarios",
          ...datosBancarios,
        }),
      })

      if (!resBancarios.ok) {
        const errorData = await resBancarios.json()
        console.error("[PropietariosTab] Error guardando datos bancarios:", errorData)
        setEditMessage({ type: "error", text: errorData.error || "Error al guardar datos bancarios" })
        setEditSubmitting(false)
        return
      }

      const resultBancarios = await resBancarios.json()
      console.log("[PropietariosTab] Respuesta datos bancarios:", resultBancarios)

      setEditMessage({ type: "success", text: "Propietario actualizado exitosamente" })
      await fetchPropietarios()
      setTimeout(() => closeEditModal(), 1500)
    } catch (err) {
      console.error("[PropietariosTab] Error:", err)
      setEditMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setEditSubmitting(false)
    }
  }

  async function toggleBloqueo(propietario: Perfil) {
    const accion = propietario.bloqueado ? "desbloquear" : "bloquear"
    if (!confirm(propietario.bloqueado
      ? `Desbloquear a ${propietario.nombre || propietario.email}?`
      : `Bloquear a ${propietario.nombre || propietario.email}?`)) return

    try {
      const res = await fetch(`/api/admin/usuarios/${propietario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      })
      const data = await res.json()
      if (data.error) alert(data.error)
      else {
        alert(data.mensaje || "Listo")
        fetchPropietarios()
      }
    } catch (err) {
      alert("Error: " + err)
    }
  }

  async function asignarPropiedad() {
    if (!editingPropietario || !propiedadSeleccionada) return

    try {
      const res = await fetch(`/api/admin/propietarios/${editingPropietario.id}/propiedades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedadId: propiedadSeleccionada }),
      })

      if (res.ok) {
        // Recargar propiedades del propietario
        const resProps = await fetch(`/api/admin/propietarios/${editingPropietario.id}/propiedades`)
        const data: Propiedad[] = await resProps.json()
        setEditingPropietario({ ...editingPropietario, propiedades: data })

        // Actualizar lista de propiedades disponibles
        await fetchPropiedadesDisponibles()
        setPropiedadSeleccionada("")

        alert("Propiedad asignada correctamente")
      } else {
        const data = await res.json()
        alert(data.error || "Error al asignar propiedad")
      }
    } catch (err) {
      alert("Error: " + err)
    }
  }

  async function quitarPropiedad(propiedadId: string) {
    if (!editingPropietario) return
    if (!confirm("¿Estás seguro de quitar esta propiedad del propietario?")) return

    try {
      const res = await fetch(`/api/admin/propietarios/${editingPropietario.id}/propiedades?propiedadId=${propiedadId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        // Recargar propiedades del propietario
        const resProps = await fetch(`/api/admin/propietarios/${editingPropietario.id}/propiedades`)
        const data: Propiedad[] = await resProps.json()
        setEditingPropietario({ ...editingPropietario, propiedades: data })

        // Actualizar lista de propiedades disponibles
        await fetchPropiedadesDisponibles()
      } else {
        const data = await res.json()
        alert(data.error || "Error al quitar propiedad")
      }
    } catch (err) {
      alert("Error: " + err)
    }
  }

  const filteredPropietarios = propietarios.filter((p) =>
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cedula?.includes(searchTerm)
  )

  return (
    <div>
      {/* Header con búsqueda y botón de nuevo */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Propietarios</h2>
          <p className="text-muted-foreground">Gestiona los propietarios de inmuebles</p>
        </div>
        <Button onClick={() => window.location.href = "/admin/usuarios?create=true"}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Propietario
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre, email o cédula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Tabla de propietarios */}
      <Card>
        <CardHeader><CardTitle>Lista de Propietarios ({filteredPropietarios.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredPropietarios.length === 0 ? (
            <p className="text-muted-foreground">No se encontraron propietarios</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Propietario</th>
                    <th className="p-3 text-left">Cédula</th>
                    <th className="p-3 text-left">Celular</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Editar</th>
                    <th className="p-3 text-center">Bloquear</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPropietarios.map((p) => (
                    <tr key={p.id} className={`border-b ${p.bloqueado ? "bg-red-50" : ""}`}>
                      <td className="p-3">
                        <p className="font-medium">
                          {p.nombre || "Sin nombre"}
                          {p.propiedades_count && p.propiedades_count > 0 && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              ({p.propiedades_count} {p.propiedades_count === 1 ? 'propiedad' : 'propiedades'})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </td>
                      <td className="p-3">{p.cedula || "—"}</td>
                      <td className="p-3">{p.celular || "—"}</td>
                      <td className="p-3 text-center">
                        {p.bloqueado ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Bloqueado</span>
                        ) : p.activo ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Activo</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Inactivo</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant={p.bloqueado ? "outline" : "destructive"}
                          onClick={() => toggleBloqueo(p)}
                        >
                          {p.bloqueado ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición */}
      {editingPropietario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-3xl my-8">
            <CardHeader>
              <CardTitle>Editar Propietario</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={actualizarPropietario} className="space-y-6">
                {/* Datos personales */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Datos Personales</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Correo electrónico</Label>
                      <Input
                        type="email"
                        disabled
                        value={editingPropietario.email}
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">El correo no se puede modificar</p>
                    </div>
                    <div>
                      <Label>Nombre completo *</Label>
                      <Input
                        type="text"
                        placeholder="Juan Pérez García"
                        value={editFormData.nombre}
                        onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Cédula</Label>
                      <Input
                        type="text"
                        placeholder="123456789"
                        value={editFormData.cedula}
                        onChange={(e) => setEditFormData({ ...editFormData, cedula: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Lugar de expedición</Label>
                      <Input
                        type="text"
                        placeholder="Bogotá D.C."
                        value={editFormData.cedula_lugar_expedicion}
                        onChange={(e) => setEditFormData({ ...editFormData, cedula_lugar_expedicion: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Celular</Label>
                      <Input
                        type="text"
                        placeholder="+57 300 123 4567"
                        value={editFormData.celular}
                        onChange={(e) => setEditFormData({ ...editFormData, celular: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Dirección</Label>
                      <Input
                        type="text"
                        placeholder="Calle 123 # 45-67"
                        value={editFormData.direccion}
                        onChange={(e) => setEditFormData({ ...editFormData, direccion: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="activo"
                        checked={editFormData.activo}
                        onChange={(e) => setEditFormData({ ...editFormData, activo: e.target.checked })}
                        className="h-4 w-4 rounded"
                      />
                      <Label htmlFor="activo">Propietario activo</Label>
                    </div>
                  </div>
                </div>

                {/* Cuentas bancarias */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Cuentas Bancarias</h3>
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
                            value={editFormData.cuenta_bancaria_1_entidad}
                            onChange={(e) => setEditFormData({ ...editFormData, cuenta_bancaria_1_entidad: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Número</Label>
                          <Input
                            type="text"
                            placeholder="123-456-789"
                            value={editFormData.cuenta_bancaria_1_numero}
                            onChange={(e) => setEditFormData({ ...editFormData, cuenta_bancaria_1_numero: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Tipo</Label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={editFormData.cuenta_bancaria_1_tipo}
                            onChange={(e) => setEditFormData({ ...editFormData, cuenta_bancaria_1_tipo: e.target.value })}
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
                            value={editFormData.cuenta_bancaria_2_entidad}
                            onChange={(e) => setEditFormData({ ...editFormData, cuenta_bancaria_2_entidad: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Número</Label>
                          <Input
                            type="text"
                            placeholder="123-456-789"
                            value={editFormData.cuenta_bancaria_2_numero}
                            onChange={(e) => setEditFormData({ ...editFormData, cuenta_bancaria_2_numero: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Tipo</Label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={editFormData.cuenta_bancaria_2_tipo}
                            onChange={(e) => setEditFormData({ ...editFormData, cuenta_bancaria_2_tipo: e.target.value })}
                          >
                            <option value="ahorros">Ahorros</option>
                            <option value="corriente">Corriente</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Llaves bancarias */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Llaves Bancarias (Colombia)</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Llave bancaria 1</Label>
                      <Input
                        type="text"
                        placeholder="ABC123DEF456"
                        value={editFormData.llave_bancaria_1}
                        onChange={(e) => setEditFormData({ ...editFormData, llave_bancaria_1: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Máximo 20 caracteres</p>
                    </div>
                    <div>
                      <Label>Llave bancaria 2</Label>
                      <Input
                        type="text"
                        placeholder="GHI789JKL012"
                        value={editFormData.llave_bancaria_2}
                        onChange={(e) => setEditFormData({ ...editFormData, llave_bancaria_2: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Máximo 20 caracteres</p>
                    </div>
                  </div>
                </div>

                {/* Asignación de propiedades */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Propiedades Asignadas</h3>

                  {/* Lista de propiedades actuales */}
                  <div className="mb-4">
                    {editingPropietario.propiedades && editingPropietario.propiedades.length > 0 ? (
                      <div className="space-y-2">
                        {editingPropietario.propiedades.map((prop) => (
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
                </div>

                {/* Mensajes */}
                {editMessage && (
                  <div
                    className={`p-3 rounded-lg ${
                      editMessage.type === "success"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {editMessage.text}
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-2">
                  <Button type="submit" disabled={editSubmitting}>
                    {editSubmitting ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeEditModal}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
