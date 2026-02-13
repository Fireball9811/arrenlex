"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function CrearUsuariosPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then((res) => {
        if (res.status === 401) {
          router.replace("/login")
          return
        }
        if (res.status === 403) {
          res.json().then((data: { userEmail?: string }) => {
            setUserEmail(data.userEmail ?? null)
            setAccessDenied(true)
            setAuthorized(false)
          })
          return
        }
        if (res.ok) {
          res.json().then(() => {
            setAuthorized(true)
          })
        } else {
          setAuthorized(false)
          setError("Error al verificar permisos. Intenta de nuevo.")
        }
      })
      .catch(() => {
        setAuthorized(false)
        setError("No se pudo verificar permisos. Revisa que el servidor esté corriendo.")
      })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Error al crear usuario")
      }

      setSuccess(true)
      setEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  if (authorized === null) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Verificando permisos...
      </div>
    )
  }

  if (authorized === false && !accessDenied && error) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold">Crear usuario</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
              Volver al dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accessDenied) {
    const envLine = userEmail ? `ADMIN_EMAILS=${userEmail}` : "ADMIN_EMAILS=tu-correo@ejemplo.com"

    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold">Crear usuario</h1>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Acceso denegado</CardTitle>
            <CardDescription>
              Solo los administradores pueden crear usuarios. Agrega tu correo en la variable{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-sm">ADMIN_EMAILS</code> del archivo{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-sm">.env.local</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {userEmail && (
              <div className="rounded-md bg-muted p-3">
                <p className="mb-1 text-sm font-medium">Tu correo actual:</p>
                <code className="break-all text-sm">{userEmail}</code>
                <p className="mt-2 text-xs text-muted-foreground">Copia esta línea en .env.local:</p>
                <code className="mt-1 block break-all rounded bg-background p-2 text-xs">
                  {envLine}
                </code>
              </div>
            )}
            <p className="text-sm">Pasos:</p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Abre <code className="rounded bg-muted px-1">dashboard/.env.local</code></li>
              <li>Reemplaza la línea de ADMIN_EMAILS por la de arriba (o tu correo)</li>
              <li>Configura SUPABASE_SERVICE_ROLE_KEY en Supabase → Settings → API</li>
              <li>Reinicia el servidor (Ctrl+C y luego npm run dev)</li>
            </ol>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Volver al dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Crear usuario</h1>

      <Card className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Nuevo usuario</CardTitle>
            <CardDescription>
              Envíe una invitación por correo. La persona recibirá un enlace para crear su contraseña y acceder al sistema.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Ej: usuario@arrenlex.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Se enviará un correo con un enlace para que la persona cree su contraseña e ingrese.
              Puedes reenviar la invitación cuantas veces sea necesario si no la reciben o el correo estaba mal.
            </p>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {success && (
              <p className="text-sm font-medium text-green-600">
                ¡Invitación enviada! La persona recibirá un correo con un enlace para crear su contraseña e ingresar.
              </p>
            )}
          </CardContent>

          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear usuario"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
