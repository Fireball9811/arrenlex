"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      setStatus("error")
      setTimeout(() => router.replace("/login?error=auth"), 2000)
      return
    }

    if (code) {
      const supabase = createClient()
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            setStatus("error")
            setTimeout(() => router.replace("/login?error=auth"), 2000)
          } else {
            setStatus("success")
            router.replace("/cambio-contrasena?next=/dashboard")
          }
        })
        .catch(() => {
          setStatus("error")
          setTimeout(() => router.replace("/login?error=auth"), 2000)
        })
      return
    }

    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")

      if (accessToken && refreshToken) {
        const supabase = createClient()
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (error) {
              setStatus("error")
              setTimeout(() => router.replace("/login?error=auth"), 2000)
            } else {
              setStatus("success")
              router.replace("/cambio-contrasena?next=/dashboard")
            }
          })
          .catch(() => {
            setStatus("error")
            setTimeout(() => router.replace("/login?error=auth"), 2000)
          })
      } else {
        setStatus("error")
        setTimeout(() => router.replace("/login?error=auth"), 2000)
      }
      return
    }

    setStatus("error")
    setTimeout(() => router.replace("/login?error=auth"), 2000)
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {status === "loading" && (
        <>
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Verificando invitación...</p>
        </>
      )}
      {status === "success" && (
        <p className="text-green-600">¡Listo! Redirigiendo al dashboard...</p>
      )}
      {status === "error" && (
        <p className="text-destructive">Error. Redirigiendo al login...</p>
      )}
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
