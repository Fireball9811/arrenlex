"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { downloadFile } from "@/lib/download-file"
import { useLang } from "@/lib/i18n/context"

interface Usuario {
  id: string
  email: string
  role: "admin" | "propietario" | "inquilino"
  nombre?: string | null
  activo: boolean
  bloqueado: boolean
  creado_en: string
  celular?: string | null
  cedula?: string | null
  cedula_lugar_expedicion?: string | null
  direccion?: string | null
}

export default function UsuariosSistemaPage() {
  const { t } = useLang()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [editForm, setEditForm] = useState({
    nombre: "",
    celular: "",
    cedula: "",
    cedula_lugar_expedicion: "",
    direccion: "",
    role: "inquilino" as Usuario["role"],
    activo: true,
    bloqueado: false,
  })
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [documentos, setDocumentos] = useState<{ name: string; path: string; url: string | null }[]>([])
  const [documentosLoading, setDocumentosLoading] = useState(false)
  const [documentosModalUser, setDocumentosModalUser] = useState<Usuario | null>(null)
  const [documentosModalList, setDocumentosModalList] = useState<{ name: string; path: string; url: string | null }[]>([])
  const [documentosModalLoading, setDocumentosModalLoading] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadingAllEdit, setDownloadingAllEdit] = useState(false)

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then((res) => res.json())
      .then(setUsuarios)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (editingUser) {
      setEditForm({
        nombre: editingUser.nombre ?? "",
        celular: editingUser.celular ?? "",
        cedula: editingUser.cedula ?? "",
        cedula_lugar_expedicion: editingUser.cedula_lugar_expedicion ?? "",
        direccion: editingUser.direccion ?? "",
        role: editingUser.role,
        activo: editingUser.activo,
        bloqueado: editingUser.bloqueado,
      })
      setEditError(null)
    }
  }, [editingUser])

  useEffect(() => {
    if (!editingUser) {
      setDocumentos([])
      return
    }
    setDocumentosLoading(true)
    fetch(`/api/admin/usuarios/${editingUser.id}/documentos`)
      .then((r) => (r.ok ? r.json() : { documentos: [] }))
      .then((data: { documentos?: { name: string; path: string; url: string | null }[] }) => {
        setDocumentos(Array.isArray(data.documentos) ? data.documentos : [])
      })
      .catch(() => setDocumentos([]))
      .finally(() => setDocumentosLoading(false))
  }, [editingUser?.id])

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

  function toggleActivo(usuario: Usuario) {
    const accion = usuario.activo ? "desactivar" : "activar"

    fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error)
        } else {
          fetch("/api/admin/usuarios")
            .then((res) => res.json())
            .then(setUsuarios)
        }
      })
      .catch((err) => alert("Error: " + err.message))
  }

  function toggleBloqueo(usuario: Usuario) {
    const accion = usuario.bloqueado ? "desbloquear" : "bloquear"
    const confirmMsg = usuario.bloqueado
      ? `${t.usuarios.confirmDesbloquear} ${usuario.email}?`
      : `${t.usuarios.confirmBloquear} ${usuario.email}?`

    if (!confirm(confirmMsg)) return

    fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error)
        } else {
          alert(data.mensaje || "Accion completada")
          fetch("/api/admin/usuarios")
            .then((res) => res.json())
            .then(setUsuarios)
        }
      })
      .catch((err) => alert("Error: " + err.message))
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)
    setEditError(null)
    fetch(`/api/admin/usuarios/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: editForm.nombre.trim() || null,
        celular: editForm.celular.trim() || null,
        cedula: editForm.cedula.trim() || null,
        cedula_lugar_expedicion: editForm.cedula_lugar_expedicion.trim() || null,
        direccion: editForm.direccion.trim() || null,
        role: editForm.role,
        activo: editForm.activo,
        bloqueado: editForm.bloqueado,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setEditError(data.error)
        } else {
          setEditingUser(null)
          fetch("/api/admin/usuarios")
            .then((res) => res.json())
            .then(setUsuarios)
        }
      })
      .catch((err) => setEditError(err.message ?? "Error de conexión"))
      .finally(() => setSaving(false))
  }

  const roleClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-800"
      case "propietario": return "bg-blue-100 text-blue-800"
      case "inquilino": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return `🔴 ${t.usuarios.roles.admin}`
      case "propietario": return `🏠 ${t.usuarios.roles.propietario}`
      case "inquilino": return `👤 ${t.usuarios.roles.inquilino}`
      default: return role
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mt-2 text-3xl font-bold">{t.usuarios.titulo}</h1>
        <p className="text-muted-foreground">
          {t.usuarios.descripcion}
        </p>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t.usuarios.totalUsuarios}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-sm">{t.usuarios.activos}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.filter(u => u.activo).length}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm">{t.usuarios.inactivos}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.filter(u => !u.activo && !u.bloqueado).length}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-sm">{t.usuarios.bloqueados}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usuarios.filter(u => u.bloqueado).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>{t.usuarios.listaTitulo}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t.usuarios.cargandoUsuarios}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">{t.usuarios.columnas.usuario}</th>
                    <th className="p-3 text-left">{t.usuarios.columnas.rol}</th>
                    <th className="p-3 text-center">{t.usuarios.columnas.estado}</th>
                    <th className="p-3 text-center">{t.usuarios.columnas.activarInactivar}</th>
                    <th className="p-3 text-center">{t.usuarios.columnas.bloquear}</th>
                    <th className="p-3 text-center">{t.usuarios.columnas.editar}</th>
                    <th className="p-3 text-center">{t.usuarios.columnas.documentos}</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className={`border-b ${usuario.bloqueado ? "bg-red-50" : ""}`}>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{usuario.nombre || usuario.email}</p>
                          <p className="text-xs text-muted-foreground">{usuario.email}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${roleClass(usuario.role)}`}>
                          {roleLabel(usuario.role)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {usuario.bloqueado ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                            {t.usuarios.estadoBloqueado}
                          </span>
                        ) : usuario.activo ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            {t.usuarios.estadoActivo}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                            {t.usuarios.estadoInactivo}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={usuario.activo && !usuario.bloqueado}
                            disabled={usuario.bloqueado}
                            onChange={() => toggleActivo(usuario)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-muted-foreground">
                            {usuario.activo ? t.usuarios.textoActivo : t.usuarios.textoInactivo}
                          </span>
                        </label>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant={usuario.bloqueado ? "outline" : "destructive"}
                          onClick={() => toggleBloqueo(usuario)}
                        >
                          {usuario.bloqueado ? t.usuarios.desbloquear : t.usuarios.bloquear}
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(usuario)}
                        >
                          {t.usuarios.columnas.editar}
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDocumentosModalUser(usuario)}
                        >
                          {t.usuarios.documentosAdjuntos}
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
              <CardTitle>{t.usuarios.documentosAdjuntos}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDocumentosModalUser(null)}
              >
                {t.usuarios.cerrar}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                {t.usuarios.usuarioLabel} {documentosModalUser.nombre || documentosModalUser.email}
              </p>
              {documentosModalLoading ? (
                <p className="text-sm text-muted-foreground">{t.usuarios.cargandoDocumentos}</p>
              ) : documentosModalList.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.usuarios.ningunDocumento}</p>
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
                      {downloadingAll ? t.usuarios.descargando : t.usuarios.descargarTodos}
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
                          {t.usuarios.descargar}
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

      {/* Modal Editar usuario */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setEditingUser(null)}
        >
          <Card
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{t.usuarios.editarModal.titulo}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => setEditingUser(null)}
              >
                {t.usuarios.cerrar}
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.usuarios.editarModal.nombreCompleto}</label>
                  <Input
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.usuarios.editarModal.correo}</label>
                  <Input value={editingUser.email} disabled className="bg-muted" />
                  <p className="mt-1 text-xs text-muted-foreground">{t.usuarios.noCorreo}</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.usuarios.editarModal.celular}</label>
                  <Input
                    value={editForm.celular}
                    onChange={(e) => setEditForm((f) => ({ ...f, celular: e.target.value }))}
                    placeholder="Ej: 3001234567"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.usuarios.editarModal.cedula}</label>
                  <Input
                    value={editForm.cedula}
                    onChange={(e) => setEditForm((f) => ({ ...f, cedula: e.target.value }))}
                    placeholder="Número de cédula"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.usuarios.editarModal.cedulaExpedicion}</label>
                  <Input
                    value={editForm.cedula_lugar_expedicion}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, cedula_lugar_expedicion: e.target.value }))
                    }
                    placeholder="Ej: Bogotá D.C."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.usuarios.editarModal.direccion}</label>
                  <Input
                    value={editForm.direccion}
                    onChange={(e) => setEditForm((f) => ({ ...f, direccion: e.target.value }))}
                    placeholder="Ej: Cra 15 #42-18"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.usuarios.editarModal.rol}</label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, role: e.target.value as Usuario["role"] }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    {(["admin", "propietario", "inquilino"] as const).map((r) => (
                      <option key={r} value={r}>
                        {t.usuarios.roles[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.activo}
                      onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">{t.usuarios.editarModal.activo}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.bloqueado}
                      onChange={(e) => setEditForm((f) => ({ ...f, bloqueado: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">{t.usuarios.editarModal.bloqueado}</span>
                  </label>
                </div>

                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium">{t.usuarios.documentosSubidos}</p>
                  {documentosLoading ? (
                    <p className="text-sm text-muted-foreground">{t.usuarios.cargandoDocumentos}</p>
                  ) : documentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.usuarios.ningunDocumento}</p>
                  ) : (
                    <>
                      <div className="mb-2 flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={downloadingAllEdit || documentos.every((d) => !d.url)}
                          onClick={async () => {
                            setDownloadingAllEdit(true)
                            const conUrl = documentos.filter((d) => d.url)
                            for (let i = 0; i < conUrl.length; i++) {
                              const doc = conUrl[i]!
                              await downloadFile(doc.url!, doc.name).catch(() => {})
                              if (i < conUrl.length - 1) {
                                await new Promise((r) => setTimeout(r, 400))
                              }
                            }
                            setDownloadingAllEdit(false)
                          }}
                        >
                          {downloadingAllEdit ? t.usuarios.descargando : t.usuarios.descargarTodos}
                        </Button>
                      </div>
                      <ul className="space-y-1 text-sm">
                      {documentos.map((doc) => (
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
                              {t.usuarios.descargar}
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                    </>
                  )}
                </div>

                {editError && (
                  <p className="text-sm text-destructive">{editError}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? t.usuarios.guardando : t.usuarios.guardarCambios}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setEditingUser(null)}
                  >
                    {t.comun.cancelar}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leyenda */}
      <Card className="mt-4 bg-gray-50">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-2">{t.usuarios.leyendaTitulo}</p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                {t.usuarios.estadoActivo}
              </span>
              <span className="text-muted-foreground">{t.usuarios.leyenda.activo}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                {t.usuarios.estadoInactivo}
              </span>
              <span className="text-muted-foreground">{t.usuarios.leyenda.inactivo}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                {t.usuarios.estadoBloqueado}
              </span>
              <span className="text-muted-foreground">{t.usuarios.leyenda.bloqueado}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800">
                🔴 {t.usuarios.roles.admin}
              </span>
              <span className="text-muted-foreground">{t.usuarios.leyenda.admin}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
