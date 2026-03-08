"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
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

function LoginContent() {
  const { t, lang, setLang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const mensaje = searchParams.get("mensaje")
  const [usuario, setUsuario] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!usuario.trim() || !contrasena.trim()) {
      setError(t.auth.errorCamposObligatorios)
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: usuario.trim(),
      password: contrasena,
    })

    if (signInError) {
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "login/page.tsx:signInError",
          message: "Error en login",
          data: {
            errorMessage: signInError.message,
            email: usuario.trim().toLowerCase(),
            hypothesisId: "H2",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      setError(signInError.message === "Invalid login credentials"
        ? t.auth.errorCredenciales
        : signInError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const metadata = data.user.user_metadata ?? {}
      const mustChange = metadata.must_change_password === true
      const expiresAt = metadata.temp_password_expires_at as number | undefined

      if (mustChange && expiresAt && Date.now() > expiresAt) {
        await supabase.auth.signOut()
        setError(t.auth.errorContrasenaExpirada)
        setLoading(false)
        return
      }

      if (mustChange) {
        const next = searchParams.get("next")
        const nextPath = next && next.startsWith("/") ? next : "/inquilino/dashboard"
        router.push(`/cambio-contrasena?next=${encodeURIComponent(nextPath)}`)
        router.refresh()
        setLoading(false)
        return
      }

      const explicitRedirect = searchParams.get("redirect")
      if (explicitRedirect && explicitRedirect.startsWith("/")) {
        router.push(explicitRedirect)
      } else {
        const res = await fetch("/api/auth/dashboard")
        const json = await res.json().catch(() => ({}))
        router.push(json.redirect || "/inquilino/dashboard")
      }
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-500 hover:text-gray-900"
        >
          <span className={lang === "es" ? "text-gray-900 font-bold" : "text-gray-400"}>ES</span>
          <span className="text-gray-300">|</span>
          <span className={lang === "en" ? "text-gray-900 font-bold" : "text-gray-400"}>EN</span>
        </button>
      </div>
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t.auth.titulo}</CardTitle>
            <CardDescription>
              {t.auth.descripcionLogin}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {mensaje && (
              <p className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">
                {mensaje}
              </p>
            )}
            <div>
              <label htmlFor="usuario" className="block text-sm font-medium mb-1">
                {t.auth.usuarioOCorreo}
              </label>
              <Input
                id="usuario"
                type="text"
                placeholder="Ej: admin@arrenlex.com"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="contrasena" className="block text-sm font-medium mb-1">
                {t.auth.contrasena}
              </label>
              <Input
                id="contrasena"
                type="password"
                placeholder="********"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.auth.ingresando : t.auth.iniciarSesion}
            </Button>
            <Link
              href="/recuperar-contrasena"
              className="text-center text-sm text-muted-foreground hover:underline"
            >
              {t.auth.olvidasteContrasena}
            </Link>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-gray-100"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></main>}>
      <LoginContent />
    </Suspense>
  )
}
