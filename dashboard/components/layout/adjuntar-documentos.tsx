"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]
const ALLOWED_EXT = [".jpg", ".jpeg", ".pdf", ".doc", ".docx"]

function isAllowedFile(file: File): boolean {
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase()
  return ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.includes(ext)
}

type AdjuntarDocumentosProps = { sidebar?: boolean }

export function AdjuntarDocumentos({ sidebar }: AdjuntarDocumentosProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!isAllowedFile(file)) {
      setMessage({ type: "error", text: "Solo se permiten archivos JPG, PDF o Word (.doc, .docx)." })
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setMessage({ type: "error", text: "El archivo no puede superar 20 MB." })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: "error", text: "Debes iniciar sesión para adjuntar documentos." })
        setUploading(false)
        return
      }

      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
      const path = `${user.id}/${safeName}`

      const { error } = await supabase.storage.from("documentos").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (error) {
        setMessage({ type: "error", text: error.message || "Error al subir el archivo." })
        setUploading(false)
        return
      }

      setMessage({ type: "ok", text: `"${file.name}" subido correctamente.` })
    } catch {
      setMessage({ type: "error", text: "Error al subir el archivo." })
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(t)
  }, [message])

  if (sidebar) {
    return (
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.pdf,.doc,.docx,image/jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="block w-full rounded p-2 text-left text-sm text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {uploading ? "Subiendo…" : "Adjuntar documentos"}
        </button>
        {message && (
          <p
            className={`px-2 text-xs ${message.type === "ok" ? "text-green-400" : "text-red-300"}`}
            role="alert"
          >
            {message.text}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.pdf,.doc,.docx,image/jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleChange}
        disabled={uploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Subiendo…" : "Adjuntar documentos"}
      </Button>
      {message && (
        <span
          className={`text-xs ${message.type === "ok" ? "text-green-600" : "text-destructive"}`}
          role="alert"
        >
          {message.text}
        </span>
      )}
    </div>
  )
}
