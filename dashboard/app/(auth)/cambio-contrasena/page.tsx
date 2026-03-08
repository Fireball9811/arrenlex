"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLang } from "@/lib/i18n/context"

const MIN_LENGTH = 6
const CHECK_SESSION_TIMEOUT_MS = 10_000

type CheckState = "checking" | "ready" | "error"

function validatePassword(password: string, msgMinimo: string): string | null {
  if (password.length < MIN_LENGTH) {
    return msgMinimo.replace("{n}", String(MIN_LENGTH))
  }
  return null
}

function CambioContrasenaContent() {
  const { t } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get("next")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkState, setCheckState] = useState<CheckState>("checking")
  const [passwordsMatch, setPasswordsMatch] = useState(false)
  const mountedRef = useRef(true)
  const checkStateResolvedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    const supabase = createClient()

    async function checkSession() {
      // #region agent log
      const href = typeof window !== "undefined" ? window.location.href : ""
      fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "cambio-contrasena:before_getUser",
          message: "checkSession started",
          data: { href },
          timestamp: Date.now(),
          hypothesisId: "H3",
        }),
      }).catch(() => {})
      // #endregion

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CHECK_SESSION_TIMEOUT_MS)
      )

      try {
        const { data: { user } } = await Promise.race([
          supabase.auth.getUser(),
          timeoutPromise,
        ])

        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "cambio-contrasena:after_getUser",
            message: "getUser response",
            data: { hasUser: !!user },
            timestamp: Date.now(),
            hypothesisId: "H3",
          }),
        }).catch(() => {})
        // #endregion

        if (!mountedRef.current) return

        checkStateResolvedRef.current = true
        if (!user) {
          setError(t.auth.debesIniciar)
          setCheckState("error")
          return
        }

        setCheckState("ready")
      } catch (err) {
        checkStateResolvedRef.current = true

        if (!mountedRef.current) return

        setError(
          err instanceof Error && err.message === "timeout"
            ? t.auth.verificacionTardio
            : t.auth.errorVerificacion
        )
        setCheckState("error")
      } finally {
        if (mountedRef.current && !checkStateResolvedRef.current) {
          setError(t.auth.errorVerificacion)
          setCheckState("error")
        }
      }
    }

    checkSession()
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validatePassword(password, t.auth.minimoCaracteres)
    if (validationError) {
      setError(validationError)
      return
    }

    if (!passwordsMatch || password !== confirm) {
      setError(t.auth.noCoinciden)
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          must_change_password: false,
          temp_password_expires_at: null,
        },
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("role")
          .eq("id", user.id)
          .single()

        if (!perfil) {
          await supabase.from("perfiles").insert({
            id: user.id,
            email: user.email!,
            nombre: user.email?.split("@")[0] || "Inquilino",
            role: "inquilino",
            activo: true,
            bloqueado: false,
          })
        }
      }

      setError(null)
      const redirectTo =
        nextParam && nextParam.startsWith("/")
          ? nextParam
          : (await fetch("/api/auth/dashboard").then((r) => r.json().catch(() => ({})))).redirect || "/inquilino/dashboard"
      setTimeout(() => router.replace(redirectTo), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la contraseña.")
    } finally {
      setLoading(false)
    }
  }

  if (checkState === "checking") {
    return (
      <div className="flex min-h-[200px] items-center justify-center py-12">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (checkState === "error" && error && !password && !confirm) {
    return (
      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t.auth.cambioTitulo}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>{t.auth.cambioTitulo}</CardTitle>
            <CardDescription>
              {t.auth.cambioDescripcion.replace("{n}", String(MIN_LENGTH))}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                {t.auth.nuevaContrasena}
              </label>
              <Input
                id="password"
                type="password"
                placeholder={t.auth.minimoCaracteres.replace("{n}", String(MIN_LENGTH))}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordsMatch(false)
                }}
                autoComplete="new-password"
                required
                minLength={MIN_LENGTH}
                aria-invalid={!!error}
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
                {t.auth.confirmarContrasena}
              </label>
              <Input
                id="confirm"
                type="password"
                placeholder={t.auth.placeholderConfirmar}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  setPasswordsMatch(password === e.target.value)
                }}
                autoComplete="new-password"
                required
                minLength={MIN_LENGTH}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !passwordsMatch || password.length < MIN_LENGTH || confirm.length < MIN_LENGTH}
            >
              {loading ? t.auth.guardandoContrasena : t.auth.cambiarContrasena}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function CambiarContrasenaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center py-12">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CambioContrasenaContent />
    </Suspense>
  )
}
