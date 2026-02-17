"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ShieldCheck, ShieldOff } from "lucide-react"
import { downloadFile } from "@/lib/download-file"

interface Usuario {
  id: string
  email: string
  role: "admin" | "propietario" | "inquilino"
  nombre?: string
  activo: boolean
  bloqueado: boolean
  creado_en: string
}

export default function UsuariosSistemaPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [documentosModalUser, setDocumentosModalUser] = useState<Usuario | null>(null)
  const [documentosModalList, setDocumentosModalList] = useState<
    { name: string; path: string; url: string | null }[]
  >([])
  const [documentosModalLoading, setDocumentosModalLoading] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)

  function loadUsuarios() {
    setLoading(true)
    fetch("/api/admin/usuarios")
      .then((res) => res.json())
      .then(setUsuarios)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsuarios()
  }, [])

  function patchUsuario(
    id: string,
    body: { accion?: string; role?: string },
    optimisticUpdate?: (prev: Usuario[]) => Usuario[]
  ) {
    setUpdatingId(id)
    fetch(`/api/admin/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          loadUsuarios()
          return
        }
        if (optimisticUpdate) {
          setUsuarios((prev) => optimisticUpdate(prev))
        } else {
          setUsuarios((prev) =>
            prev.map((u) => (u.id === id ? { ...u, ...data } : u))
          )
        }
      })
      .catch(() => loadUsuarios())
      .finally(() => setUpdatingId(null))
  }

  function toggleActivo(usuario: Usuario) {
    if (usuario.bloqueado) return
    const accion = usuario.activo ? "desactivar" : "activar"
    patchUsuario(usuario.id, { accion }, (prev) =>
      prev.map((u) =>
        u.id === usuario.id
          ? { ...u, activo: accion === "activar" }
          : u
      )
    )
  }

  function toggleBloqueo(usuario: Usuario) {
    const accion = usuario.bloqueado ? "desbloquear" : "bloquear"
    patchUsuario(usuario.id, { accion }, (prev) =>
      prev.map((u) =>
        u.id === usuario.id
          ? {
              ...u,
              bloqueado: accion === "bloquear",
              activo: accion === "desbloquear",
            }
          : u
      )
    )
  }

  function changeRol(usuario: Usuario, newRole: "admin" | "propietario" | "inquilino") {
    if (newRole === usuario.role) return
    patchUsuario(usuario.id, { role: newRole }, (prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, role: newRole } : u))
    )
  }

  useEffect(() => {
    if (!documentosModalUser) {
      setDocumentosModalList([])
      return
    }
    setDocumentosModalLoading(true)
    fetch(`/api/admin/usuarios/${documentosModalUser.id}/documentos`)
      .then((r) => (r.ok ? r.json() : { documentos: [] }))
      .then((data: { documentos?: { name: string; path: string; url: string | null }[] }) => {
        setDocumentosModalList(Array.isArray(data.documentos) ? data.documentos : [])
      })
      .catch(() => setDocumentosModalList([]))
      .finally(() => setDocumentosModalLoading(false))
  }, [documentosModalUser?.id])

  const roleClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800"
      case "propietario":
        return "bg-blue-100 text-blue-800"
      case "inquilino":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador"
      case "propietario":
        return "Propietario"
      case "inquilino":
        return "Inquilino"
      default:
        return role
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes/personas" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Personas
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Usuarios del Sistema</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios, roles y permisos de acceso. Los cambios se aplican al instante.
        </p>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.length}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-sm">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.filter((u) => u.activo).length}</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-sm">Inactivos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {usuarios.filter((u) => !u.activo && !u.bloqueado).length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm">Bloqueados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.filter((u) => u.bloqueado).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Lista de Usuarios y Permisos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Edita rol, activa/desactiva o bloquea sin confirmación. Los cambios se guardan al instante.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando usuarios...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Usuario</th>
                    <th className="p-3 text-left">Rol / Permisos</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Activar / Inactivar</th>
                    <th className="p-3 text-center">Bloquear</th>
                    <th className="p-3 text-center">Documentos</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className={`border-b ${usuario.bloqueado ? "bg-red-50" : ""} ${updatingId === usuario.id ? "opacity-70" : ""}`}
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{usuario.nombre || usuario.email}</p>
                          <p className="text-xs text-muted-foreground">{usuario.email}</p>
                        </div>
                      </td>

                      {/* Rol editable */}
                      <td className="p-3">
                        <select
                          value={usuario.role}
                          disabled={updatingId === usuario.id}
                          onChange={(e) =>
                            changeRol(usuario, e.target.value as "admin" | "propietario" | "inquilino")
                          }
                          className={`rounded border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium ${roleClass(usuario.role)} focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50`}
                        >
                          <option value="admin">Administrador</option>
                          <option value="propietario">Propietario</option>
                          <option value="inquilino">Inquilino</option>
                        </select>
                      </td>

                      <td className="p-3 text-center">
                        {usuario.bloqueado ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                            Bloqueado
                          </span>
                        ) : usuario.activo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                            <ShieldOff className="h-3.5 w-3.5" />
                            Inactivo
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={usuario.activo && !usuario.bloqueado}
                            disabled={usuario.bloqueado || updatingId === usuario.id}
                            onChange={() => toggleActivo(usuario)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-muted-foreground">
                            {usuario.activo ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                      </td>

                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant={usuario.bloqueado ? "outline" : "destructive"}
                          disabled={updatingId === usuario.id}
                          onClick={() => toggleBloqueo(usuario)}
                        >
                          {usuario.bloqueado ? "Desbloquear" : "Bloquear"}
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDocumentosModalUser(usuario)}
                        >
                          Documentos adjuntos
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

      {/* Modal Documentos adjuntos */}
      {documentosModalUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDocumentosModalUser(null)}
        >
          <Card
            className="w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Documentos adjuntos</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDocumentosModalUser(null)}
              >
                Cerrar
              </Button>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Usuario: {documentosModalUser.nombre || documentosModalUser.email}
              </p>
              {documentosModalLoading ? (
                <p className="text-sm text-muted-foreground">Cargando documentos…</p>
              ) : documentosModalList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ningún documento subido.</p>
              ) : (
                <>
                  <div className="mb-3 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={downloadingAll || documentosModalList.every((d) => !d.url)}
                      onClick={async () => {
                        setDownloadingAll(true)
                        const conUrl = documentosModalList.filter((d) => d.url)
                        for (let i = 0; i < conUrl.length; i++) {
                          const doc = conUrl[i]!
                          await downloadFile(doc.url!, doc.name).catch(() => {})
                          if (i < conUrl.length - 1) {
                            await new Promise((r) => setTimeout(r, 400))
                          }
                        }
                        setDownloadingAll(false)
                      }}
                    >
                      {downloadingAll ? "Descargando…" : "Descargar todos"}
                    </Button>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {documentosModalList.map((doc) => (
                      <li key={doc.path} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1">
                          {doc.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline hover:no-underline"
                            >
                              {doc.name}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">{doc.name}</span>
                          )}
                        </span>
                        {doc.url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              downloadFile(doc.url!, doc.name).catch(() =>
                                alert("Error al descargar")
                              )
                            }
                          >
                            Descargar
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leyenda */}
      <Card className="mt-4 bg-gray-50">
        <CardContent className="pt-4">
          <p className="mb-2 text-sm font-semibold">Leyenda:</p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                Activo
              </span>
              <span className="text-muted-foreground">Puede acceder a la plataforma</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                Inactivo
              </span>
              <span className="text-muted-foreground">No puede acceder temporalmente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                Bloqueado
              </span>
              <span className="text-muted-foreground">Bloqueado definitivamente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800">
                Administrador
              </span>
              <span className="text-muted-foreground">Acceso total al sistema</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
