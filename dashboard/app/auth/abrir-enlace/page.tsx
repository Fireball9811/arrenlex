"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"

function AbrirEnlaceForm() {
  const [url, setUrl] = useState("")
  const [error, setError] = useState(false)
  const searchParams = useSearchParams()
  const hasError = searchParams.get("error") === "1"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      setError(true)
      return
    }
    setError(false)
    window.location.href = `/auth/abrir-enlace/ir?url=${encodeURIComponent(trimmed)}`
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-100 p-6">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow">
        <h1 className="mb-2 text-xl font-semibold text-gray-800">
          Abrir enlace real del correo
        </h1>
        <p className="mb-4 text-sm text-gray-600">
          Si el enlace de la invitación se queda cargando (por ejemplo al abrirlo desde Gmail),
          copia ese enlace, pégalo aquí y haz clic en &quot;Abrir enlace real&quot;. Serás redirigido
          a la verificación de Supabase y luego a la aplicación.
        </p>
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="mb-2 font-medium">Antes de abrir el enlace, verifica:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>El servidor local está en <strong>http://localhost:3000</strong> (npm run dev en la carpeta dashboard).</li>
            <li>No uses el enlace envuelto por Google: usa esta página y pega el enlace aquí.</li>
            <li>En Supabase → Authentication → URL Configuration: Site URL = <strong>http://localhost:3000</strong>, Redirect URLs incluye <strong>http://localhost:3000/auth/callback</strong> (sin barra final, sin https).</li>
            <li>Mismo navegador donde iniciaste el flujo (evita bloqueo de cookies).</li>
          </ul>
        </div>
        {(hasError || error) && (
          <p className="mb-4 text-sm text-red-600">
            {error ? "Escribe o pega un enlace." : "El enlace no es válido. Debe ser el enlace del correo que empieza por https://www.google.com/url?q=..."}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega aquí el enlace del correo (ej. https://www.google.com/url?q=...)"
            className="min-h-[120px] w-full rounded border border-gray-300 px-3 py-2 text-sm"
            rows={4}
          />
          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
          >
            Abrir enlace real
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-500">
          Solo se aceptan enlaces envueltos por Google que apunten al verify de Supabase de esta aplicación.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Prueba manual: abre <a href="/auth/callback" className="underline">/auth/callback</a> sin código; debe redirigir a login. Si da error 500, el problema está en el handler.
        </p>
      </div>
    </div>
  )
}

export default function AbrirEnlacePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-100">Cargando...</div>}>
      <AbrirEnlaceForm />
    </Suspense>
  )
}
