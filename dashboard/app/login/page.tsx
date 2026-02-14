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

function LoginContent() {
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
      setError("Usuario y contraseña son obligatorios")
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: usuario.trim(),
      password: contrasena,
    })

    if (signInError) {
      setError(signInError.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos"
        : signInError.message)
      setLoading(false)
      return
    }

    if (data.user) {
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
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Arrenlex Inmobiliaria</CardTitle>
            <CardDescription>
              Ingrese sus credenciales para acceder
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
                Usuario o correo
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
                Contraseña
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
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>
            <Link
              href="/recuperar-contrasena"
              className="text-center text-sm text-muted-foreground hover:underline"
            >
              ¿Olvidaste tu contraseña?
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
