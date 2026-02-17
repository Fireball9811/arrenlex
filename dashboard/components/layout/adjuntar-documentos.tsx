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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return

    const valid: File[] = []
    const rejected: string[] = []
    for (const file of files) {
      if (!isAllowedFile(file)) {
        rejected.push(`${file.name} (tipo no permitido)`)
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        rejected.push(`${file.name} (supera 20 MB)`)
        continue
      }
      valid.push(file)
    }

    if (valid.length === 0) {
      setMessage({
        type: "error",
        text: rejected.length > 0 ? rejected.join(". ") : "Ningún archivo válido (JPG, PDF o Word, máx. 20 MB).",
      })
      return
    }

    setUploading(true)
    setMessage(null)
    setUploadProgress({ current: 0, total: valid.length })

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: "error", text: "Debes iniciar sesión para adjuntar documentos." })
        setUploading(false)
        setUploadProgress(null)
        return
      }

      let ok = 0
      let fail = 0
      for (let i = 0; i < valid.length; i++) {
        setUploadProgress({ current: i + 1, total: valid.length })
        const file = valid[i]!
        const safeName = `${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
        const path = `${user.id}/${safeName}`
        const { error } = await supabase.storage.from("documentos").upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        })
        if (error) fail++
        else ok++
      }

      setUploadProgress(null)
      if (fail === 0) {
        setMessage({
          type: "ok",
          text: valid.length === 1 ? `"${valid[0]!.name}" subido correctamente.` : `${ok} archivos subidos correctamente.`,
        })
      } else {
        setMessage({
          type: "error",
          text: `${ok} subidos, ${fail} fallos.${rejected.length > 0 ? " Rechazados: " + rejected.join(", ") : ""}`,
        })
      }
    } catch {
      setMessage({ type: "error", text: "Error al subir los archivos." })
      setUploadProgress(null)
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(t)
  }, [message])

  const progressText = uploadProgress
    ? `Subiendo ${uploadProgress.current} de ${uploadProgress.total}…`
    : uploading
      ? "Subiendo…"
      : "Adjuntar documentos"

  if (sidebar) {
    return (
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          multiple
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
          {progressText}
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
        multiple
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
        {progressText}
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
