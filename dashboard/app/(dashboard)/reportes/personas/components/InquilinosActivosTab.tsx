"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Pencil, CheckCircle, XCircle, Mail } from "lucide-react"
import type { Perfil } from "@/lib/types/database"

type InquilinoActivo = Perfil & {
  tieneUsuario: boolean
  tieneContratoActivo: boolean
  arrendatarioId?: string
  contratoId?: string
}

export function InquilinosActivosTab() {
  const [inquilinos, setInquilinos] = useState<InquilinoActivo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const [editingInquilino, setEditingInquilino] = useState<InquilinoActivo | null>(null)
  const [editFormData, setEditFormData] = useState({
    nombre: "",
    celular: "",
    cedula: "",
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [creandoUsuario, setCreandoUsuario] = useState<string | null>(null)

  useEffect(() => {
    fetchInquilinos()
  }, [])

  async function fetchInquilinos() {
    setLoading(true)
    try {
      const res = await fetch("/api/reportes/inquilinos-activos")
      const data = await res.json()
      setInquilinos(data || [])
    } catch (error) {
      console.error("Error fetching inquilinos:", error)
    } finally {
      setLoading(false)
    }
  }

  async function crearUsuarioParaArrendatario(inquilino: InquilinoActivo) {
    if (!confirm(`¿Crear cuenta de usuario para ${inquilino.email}?`)) return

    setCreandoUsuario(inquilino.email)

    try {
      const res = await fetch("/api/reportes/crear-usuario-arrendatario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arrendatarioId: inquilino.arrendatarioId,
          email: inquilino.email,
          nombre: inquilino.nombre,
          cedula: inquilino.cedula,
          celular: inquilino.celular,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message || "Usuario creado exitosamente. Las credenciales han sido enviadas por correo.")
        fetchInquilinos()
      } else {
        alert(data.error || "Error al crear usuario")
      }
    } catch (error) {
      alert("Error: " + error)
    } finally {
      setCreandoUsuario(null)
    }
  }

  function toggleBloqueo(inquilino: InquilinoActivo) {
    if (!inquilino.id) return // Si no tiene ID (viene de arrendatario), no se puede bloquear

    const accion = inquilino.bloqueado ? "desbloquear" : "bloquear"
    if (!confirm(inquilino.bloqueado ? `Desbloquear a ${inquilino.email}?` : `Bloquear a ${inquilino.email}?`)) return
    fetch(`/api/admin/usuarios/${inquilino.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else {
          alert(data.mensaje || "Listo")
          fetchInquilinos()
        }
      })
      .catch((err) => alert("Error: " + err))
  }

  function openEditModal(inquilino: InquilinoActivo) {
    if (!inquilino.id) return // Solo se pueden editar usuarios con cuenta

    setEditingInquilino(inquilino)
    setEditFormData({
      nombre: inquilino.nombre || "",
      celular: inquilino.celular || "",
      cedula: inquilino.cedula || "",
    })
  }

  async function actualizarInquilino(e: React.FormEvent) {
    e.preventDefault()
    if (!editingInquilino || !editingInquilino.id) return

    setEditSubmitting(true)

    try {
      await fetch(`/api/admin/usuarios/${editingInquilino.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_datos_personales",
          nombre: editFormData.nombre,
          celular: editFormData.celular,
          cedula: editFormData.cedula,
        }),
      })

      fetchInquilinos()
      setEditingInquilino(null)
    } catch (err) {
      alert("Error: " + err)
    } finally {
      setEditSubmitting(false)
    }
  }

  const filteredInquilinos = inquilinos.filter((i) =>
    i.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cedula?.includes(searchTerm)
  )

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inquilinos Activos</h2>
          <p className="text-muted-foreground">Inquilinos con contratos activos</p>
        </div>
        <Button onClick={() => window.location.href = "/admin/usuarios?create=true&role=inquilino"}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Inquilino
        </Button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, email o cédula..."
          className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Lista de Inquilinos Activos ({filteredInquilinos.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredInquilinos.length === 0 ? (
            <p className="text-muted-foreground">No hay inquilinos activos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Inquilino</th>
                    <th className="p-3 text-left">Cédula</th>
                    <th className="p-3 text-left">Celular</th>
                    <th className="p-3 text-center">Usuario</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Editar</th>
                    <th className="p-3 text-center">Bloquear</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquilinos.map((i) => (
                    <tr key={i.id || i.email} className="border-b">
                      <td className="p-3">
                        <p className="font-medium">{i.nombre || "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{i.email}</p>
                      </td>
                      <td className="p-3">{i.cedula || "—"}</td>
                      <td className="p-3">{i.celular || "—"}</td>
                      <td className="p-3 text-center">
                        {i.tieneUsuario ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                            Sí
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800 font-semibold">
                              Sin usuario
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => crearUsuarioParaArrendatario(i)}
                              disabled={creandoUsuario === i.email}
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Contrato Activo</span>
                      </td>
                      <td className="p-3 text-center">
                        {i.tieneUsuario ? (
                          <Button size="sm" variant="outline" onClick={() => openEditModal(i)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {i.tieneUsuario ? (
                          <Button size="sm" variant="destructive" onClick={() => toggleBloqueo(i)}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
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
      {editingInquilino && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Editar Inquilino</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={actualizarInquilino} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    disabled
                    value={editingInquilino.email}
                    className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre completo</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editFormData.nombre}
                    onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cédula</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editFormData.cedula}
                    onChange={(e) => setEditFormData({ ...editFormData, cedula: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Celular</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editFormData.celular}
                    onChange={(e) => setEditFormData({ ...editFormData, celular: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={editSubmitting}>
                    {editSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingInquilino(null)}>
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
