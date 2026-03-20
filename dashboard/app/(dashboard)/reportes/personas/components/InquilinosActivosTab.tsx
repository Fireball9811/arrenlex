"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Pencil, XCircle, Mail, Building2, MapPin, Power, Trash2, CheckCircle } from "lucide-react"
import type { Perfil } from "@/lib/types/database"

type InquilinoActivo = Perfil & {
  tieneUsuario: boolean
  tieneContratoActivo: boolean
  arrendatarioId: string
  contratoId?: string
  contratoEstado?: string
  propietario?: {
    id: string
    nombre: string | null
    email: string
    celular: string | null
  } | null
  propiedad?: {
    direccion: string
    ciudad: string
  } | null
}

export function InquilinosActivosTab() {
  const [inquilinos, setInquilinos] = useState<InquilinoActivo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
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
    if (!inquilino.email) return
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

  function toggleActivo(inquilino: InquilinoActivo) {
    if (!inquilino.id) return

    const accion = inquilino.activo ? "desactivar" : "activar"
    if (!confirm(inquilino.activo
      ? `¿Desactivar a ${inquilino.nombre || inquilino.email}?`
      : `¿Activar a ${inquilino.nombre || inquilino.email}?`)) return

    fetch(`/api/admin/usuarios/${inquilino.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else fetchInquilinos()
      })
      .catch((err) => alert("Error: " + err))
  }

  function toggleBloqueo(inquilino: InquilinoActivo) {
    if (!inquilino.id) return

    const accion = inquilino.bloqueado ? "desbloquear" : "bloquear"
    if (!confirm(inquilino.bloqueado
      ? `¿Desbloquear a ${inquilino.nombre || inquilino.email}?`
      : `¿Bloquear a ${inquilino.nombre || inquilino.email}?`)) return

    fetch(`/api/admin/usuarios/${inquilino.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else fetchInquilinos()
      })
      .catch((err) => alert("Error: " + err))
  }

  function eliminarUsuario(inquilino: InquilinoActivo) {
    if (!inquilino.id) return
    if (!confirm(`¿Eliminar a ${inquilino.nombre || inquilino.email}? Esta acción no se puede deshacer.`)) return

    fetch(`/api/admin/usuarios/${inquilino.id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error)
        else {
          alert("Usuario eliminado exitosamente")
          fetchInquilinos()
        }
      })
      .catch((err) => alert("Error: " + err))
  }

  const filteredInquilinos = inquilinos.filter((i) =>
    i.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay inquilinos activos con contratos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Inquilino</th>
                    <th className="p-3 text-left">Cédula</th>
                    <th className="p-3 text-left">Celular</th>
                    <th className="p-3 text-left">Propietario</th>
                    <th className="p-3 text-left">Propiedad</th>
                    <th className="p-3 text-center">Usuario</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquilinos.map((i) => (
                    <tr key={i.arrendatarioId} className="border-b">
                      <td className="p-3">
                        <p className="font-medium">{i.nombre || "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{i.email || "—"}</p>
                      </td>
                      <td className="p-3">{i.cedula || "—"}</td>
                      <td className="p-3">{i.celular || "—"}</td>
                      <td className="p-3">
                        {i.propietario ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{i.propietario.nombre || "Sin nombre"}</span>
                            </div>
                            {(i.propietario.email || i.propietario.celular) && (
                              <div className="text-xs text-muted-foreground ml-4">
                                {i.propietario.email && <div>{i.propietario.email}</div>}
                                {i.propietario.celular && <div>{i.propietario.celular}</div>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {i.propiedad ? (
                          <div className="flex flex-col gap-0.5 max-w-xs">
                            <div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{i.propiedad.direccion}</span>
                            </div>
                            {i.propiedad.ciudad && (
                              <div className="text-xs text-muted-foreground ml-4">{i.propiedad.ciudad}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
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
                        {i.bloqueado ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Bloqueado</span>
                        ) : i.activo ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Activo</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Inactivo</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Editar arrendatario */}
                          <Link href={`/reportes/personas/arrendatarios/${i.arrendatarioId}`}>
                            <Button size="sm" variant="outline" title="Editar arrendatario">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </Link>
                          {/* Activo/Inactivar */}
                          {i.tieneUsuario && (
                            <Button
                              size="sm"
                              variant={i.activo ? "outline" : "default"}
                              onClick={() => toggleActivo(i)}
                              title={i.activo ? "Desactivar" : "Activar"}
                            >
                              <Power className="h-3 w-3" />
                            </Button>
                          )}
                          {/* Bloquear/Desbloquear */}
                          {i.tieneUsuario && (
                            <Button
                              size="sm"
                              variant={i.bloqueado ? "outline" : "destructive"}
                              onClick={() => toggleBloqueo(i)}
                              title={i.bloqueado ? "Desbloquear" : "Bloquear"}
                            >
                              {i.bloqueado ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            </Button>
                          )}
                          {/* Eliminar usuario */}
                          {i.tieneUsuario && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => eliminarUsuario(i)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
