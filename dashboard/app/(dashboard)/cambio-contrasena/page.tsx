"use client"

import { Suspense, useState, useEffect } from "react"
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

const MIN_LENGTH = 8

function validatePassword(password: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `Mínimo ${MIN_LENGTH} caracteres.`
  }
  if (!/[A-Z]/.test(password)) {
    return "Debe incluir al menos una letra mayúscula."
  }
  if (!/[a-z]/.test(password)) {
    return "Debe incluir al menos una letra minúscula."
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return "Debe incluir al menos un carácter especial (!@#$%^&* etc.)."
  }
  return null
}

function CambioContrasenaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get("next") ?? "/dashboard"
  const [nueva, setNueva] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setChecking(false)
      if (!user) {
        setError("Debes iniciar sesión para cambiar la contraseña.")
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validatePassword(nueva)
    if (validationError) {
      setError(validationError)
      return
    }
    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password: nueva })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setNueva("")
    setConfirmar("")

    // Si viene del flujo de invitación (param next), redirigir al dashboard/datos
    if (searchParams.get("next")) {
      router.replace(nextUrl)
      router.refresh()
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error && !nueva && !confirmar) {
    return (
      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Cambio de contraseña</CardTitle>
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
            <CardTitle>Cambio de contraseña</CardTitle>
            <CardDescription>
              Estás autenticado. Ingresa tu nueva contraseña (mínimo 8 caracteres, mayúsculas, minúsculas y caracteres especiales).
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label htmlFor="nueva" className="mb-1 block text-sm font-medium">
                Nueva contraseña
              </label>
              <Input
                id="nueva"
                type="password"
                placeholder="Mín. 8 caracteres, mayúsculas, minúsculas y especiales"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                autoComplete="new-password"
                required
                minLength={MIN_LENGTH}
                aria-invalid={!!error}
              />
            </div>

            <div>
              <label htmlFor="confirmar" className="mb-1 block text-sm font-medium">
                Confirmar contraseña
              </label>
              <Input
                id="confirmar"
                type="password"
                placeholder="Repite la nueva contraseña"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
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
            {success && (
              <p className="text-sm text-green-600" role="status">
                Contraseña actualizada correctamente.
              </p>
            )}
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando…" : "Cambiar contraseña"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function CambioContrasenaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CambioContrasenaContent />
    </Suspense>
  )
}
