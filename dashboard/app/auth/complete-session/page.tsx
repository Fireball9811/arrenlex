"use client"

import { Suspense, useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type State = "checking" | "success" | "error"

function CompleteSessionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<State>("checking")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [diagnostic, setDiagnostic] = useState<{
    href: string
    searchParams: Record<string, string>
    hash: string
    hashParams: Record<string, string>
    session: unknown
  } | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const supabase = createClient()
    const href = typeof window !== "undefined" ? window.location.href : ""
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    const params: Record<string, string> = {}
    searchParams.forEach((v, k) => {
      params[k] = v
    })

    const hashParams: Record<string, string> = {}
    if (hash) {
      const hashPart = hash.startsWith("#") ? hash.slice(1) : hash
      new URLSearchParams(hashPart).forEach((v, k) => {
        hashParams[k] = v
      })
    }

    const code = searchParams.get("code")
    const accessToken = hashParams.access_token ?? searchParams.get("access_token")
    const refreshToken = hashParams.refresh_token ?? searchParams.get("refresh_token")
    const type = hashParams.type ?? searchParams.get("type") ?? ""

    setDiagnostic({
      href,
      searchParams: params,
      hash,
      hashParams,
      session: null,
    })

    async function run() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setErrorMessage(error.message)
          setState("error")
          const { data: { session } } = await supabase.auth.getSession()
          setDiagnostic((d) => (d ? { ...d, session } : null))
          return
        }
        const { data: { session } } = await supabase.auth.getSession()
        setDiagnostic((d) => (d ? { ...d, session } : null))
        setState("success")
        if (type === "recovery" || type === "invite" || type === "magiclink") {
          router.replace("/cambio-contrasena")
          return
        }
        const res = await fetch("/api/auth/dashboard")
        const data = await res.json().catch(() => ({}))
        router.replace(data.redirect || "/inquilino/dashboard")
        return
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          setErrorMessage(error.message)
          setState("error")
          const { data: { session } } = await supabase.auth.getSession()
          setDiagnostic((d) => (d ? { ...d, session } : null))
          return
        }
        const { data: { session } } = await supabase.auth.getSession()
        setDiagnostic((d) => (d ? { ...d, session } : null))
        setState("success")
        if (type === "recovery" || type === "invite" || type === "magiclink") {
          router.replace("/cambio-contrasena")
          return
        }
        const res = await fetch("/api/auth/dashboard")
        const data = await res.json().catch(() => ({}))
        router.replace(data.redirect || "/inquilino/dashboard")
        return
      }

      setErrorMessage("No se encontró código ni tokens en la URL.")
      setState("error")
      const { data: { session } } = await supabase.auth.getSession()
      setDiagnostic((d) => (d ? { ...d, session } : null))
    }

    run()
  }, [searchParams, router])

  if (state === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100 p-6">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Completando sesión...</p>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100 p-6">
        <div className="max-w-md rounded-lg bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-destructive">Error al activar el enlace</h1>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Ir a inicio de sesión
          </button>
        </div>
        {diagnostic && (
          <details className="mt-4 w-full max-w-2xl rounded bg-white p-4 shadow">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Diagnóstico (temporal)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-600">
              {JSON.stringify(
                {
                  href: diagnostic.href,
                  searchParams: diagnostic.searchParams,
                  hasHash: !!diagnostic.hash,
                  hashParamKeys: Object.keys(diagnostic.hashParams),
                  hasSession: !!diagnostic.session,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100 p-6">
      <p className="text-muted-foreground">Redirigiendo...</p>
    </div>
  )
}

export default function CompleteSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CompleteSessionContent />
    </Suspense>
  )
}
