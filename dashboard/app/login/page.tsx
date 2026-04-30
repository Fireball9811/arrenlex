"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLang } from "@/lib/i18n/context"
import { createAdminClient } from "@/lib/supabase/admin"

function LoginContent() {
  const { t, lang, setLang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const mensaje = searchParams.get("mensaje")
  const [usuario, setUsuario] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
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

    try {
      const supabase = createClient()
      let emailToUse = usuario.trim()

      // Si no tiene @, es un username - buscar el email correspondiente
      if (!emailToUse.includes("@")) {
        const response = await fetch("/api/lookup-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: emailToUse }),
        })

        const data = await response.json()

        if (!response.ok || !data.email) {
          setError(t.auth.errorCredenciales)
          setLoading(false)
          return
        }

        emailToUse = data.email
      }

      // Hacer login con Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: contrasena,
      })

      if (signInError) {
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

        // Redirigir según rol o parámetro
        const explicitRedirect = searchParams.get("redirect")
        if (explicitRedirect && explicitRedirect.startsWith("/")) {
          router.push(explicitRedirect)
        } else {
          const res = await fetch("/api/auth/dashboard")
          const json = await res.json().catch(() => ({}))
          router.push(json.redirect || "/propietario/dashboard")
        }
        router.refresh()
      }
      setLoading(false)
    } catch (err) {
      console.error("Error en login:", err)
      setError("Error al iniciar sesión")
      setLoading(false)
    }
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
                Email o nombre de usuario
              </label>
              <Input
                id="usuario"
                type="text"
                placeholder="Email o usuario (ej: Luis o tu@email.com)"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="contrasena" className="block text-sm font-medium mb-1">
                {t.auth.contrasena}
              </label>
              <div className="relative">
                <Input
                  id="contrasena"
                  type={mostrarContrasena ? "text" : "password"}
                  placeholder="********"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {mostrarContrasena ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
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
