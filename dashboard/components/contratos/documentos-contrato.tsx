"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  File,
  FileText,
  Image,
  Download,
  Trash2,
  Upload,
  FileIcon,
} from "lucide-react"
import { useLang } from "@/lib/i18n/context"

type Documento = {
  id: string
  contrato_id: string
  nombre: string
  tipo: string
  url: string
  subido_por: string
  created_at: string
}

type DocumentosContratoProps = {
  contratoId: string
  puedeEditar: boolean
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  "application/pdf": <FileText className="h-5 w-5 text-red-500" />,
  "application/msword": <FileText className="h-5 w-5 text-blue-500" />,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": <FileText className="h-5 w-5 text-blue-500" />,
  "image/jpeg": <Image className="h-5 w-5 text-green-500" />,
  "image/jpg": <Image className="h-5 w-5 text-green-500" />,
  "image/png": <Image className="h-5 w-5 text-green-500" />,
}

export function DocumentosContrato({ contratoId, puedeEditar }: DocumentosContratoProps) {
  const { t } = useLang()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  useEffect(() => {
    cargarDocumentos()
  }, [contratoId])

  async function cargarDocumentos() {
    setLoading(true)
    try {
      const res = await fetch(`/api/contratos/${contratoId}/documentos`)
      if (res.ok) {
        const data = await res.json()
        setDocumentos(data)
      }
    } catch (error) {
      console.error("Error cargando documentos:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append("archivo", file)

      const res = await fetch(`/api/contratos/${contratoId}/documentos`, {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        await cargarDocumentos()
        // Limpiar el input
        e.target.value = ""
      } else {
        const error = await res.json()
        alert(error.error || "Error al subir el archivo")
      }
    } catch (error) {
      console.error("Error subiendo archivo:", error)
      alert("Error al subir el archivo")
    } finally {
      setSubiendo(false)
    }
  }

  async function handleEliminar(documento: Documento) {
    if (!confirm(`¿Eliminar el documento "${documento.nombre}"?`)) return

    setEliminando(documento.id)
    try {
      const res = await fetch(`/api/contratos/${contratoId}/documentos/${documento.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await cargarDocumentos()
      } else {
        const error = await res.json()
        alert(error.error || "Error al eliminar el documento")
      }
    } catch (error) {
      console.error("Error eliminando documento:", error)
      alert("Error al eliminar el documento")
    } finally {
      setEliminando(null)
    }
  }

  async function handleDescargar(documento: Documento) {
    try {
      const res = await fetch(`/api/contratos/${contratoId}/documentos/${documento.id}`)
      if (res.ok) {
        const data = await res.json()
        // Abrir la URL firmada en una nueva pestaña
        window.open(data.url, "_blank")
      } else {
        const error = await res.json()
        alert(error.error || "Error al descargar el documento")
      }
    } catch (error) {
      console.error("Error descargando documento:", error)
      alert("Error al descargar el documento")
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getFileIcon = (tipo: string) => {
    return FILE_ICONS[tipo] || <File className="h-5 w-5 text-gray-500" />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Documentos del Contrato</CardTitle>
            <CardDescription>
              Documentos adjuntos al contrato (ordenados del más reciente al más antiguo)
            </CardDescription>
          </div>
          {puedeEditar && (
            <label>
              <Button
                variant="outline"
                size="sm"
                disabled={subiendo}
                asChild
              >
                <span className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {subiendo ? "Subiendo..." : "Adjuntar"}
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleSubirArchivo}
                disabled={subiendo}
              />
            </label>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando documentos...</p>
        ) : documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <File className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No hay documentos adjuntos a este contrato
            </p>
            {puedeEditar && (
              <p className="mt-1 text-xs text-muted-foreground">
                Usa el botón "Adjuntar" para agregar documentos
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {documentos.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                {getFileIcon(doc.tipo)}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{doc.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDescargar(doc)}
                    title="Descargar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {puedeEditar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminar(doc)}
                      disabled={eliminando === doc.id}
                      className="text-destructive hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
