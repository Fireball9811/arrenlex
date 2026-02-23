"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Pencil, CheckCircle, XCircle } from "lucide-react"
import type { Perfil } from "@/lib/types/database"

export function InquilinosActivosTab() {
  const [inquilinos, setInquilinos] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const [editingInquilino, setEditingInquilino] = useState<Perfil | null>(null)
  const [editFormData, setEditFormData] = useState({
    nombre: "",
    celular: "",
    cedula: "",
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

  useEffect(() => {
    fetchInquilinos()
  }, [])

  async function fetchInquilinos() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/usuarios")
      const data = await res.json()
      const soloInquilinos = (data || []).filter((u: Perfil) => u.role === "inquilino" && u.activo && !u.bloqueado)
      setInquilinos(soloInquilinos)
    } catch (error) {
      console.error("Error fetching inquilinos:", error)
    } finally {
      setLoading(false)
    }
  }

  function toggleBloqueo(inquilino: Perfil) {
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

  function openEditModal(inquilino: Perfil) {
    setEditingInquilino(inquilino)
    setEditFormData({
      nombre: inquilino.nombre || "",
      celular: inquilino.celular || "",
      cedula: inquilino.cedula || "",
    })
  }

  async function actualizarInquilino(e: React.FormEvent) {
    e.preventDefault()
    if (!editingInquilino) return

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
          <p className="text-muted-foreground">Inquilinos con cuenta activa en el sistema</p>
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
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Editar</th>
                    <th className="p-3 text-center">Bloquear</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquilinos.map((i) => (
                    <tr key={i.id} className="border-b">
                      <td className="p-3">
                        <p className="font-medium">{i.nombre || "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{i.email}</p>
                      </td>
                      <td className="p-3">{i.cedula || "—"}</td>
                      <td className="p-3">{i.celular || "—"}</td>
                      <td className="p-3 text-center">
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Activo</span>
                      </td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(i)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="destructive" onClick={() => toggleBloqueo(i)}>
                          <XCircle className="h-3 w-3" />
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
