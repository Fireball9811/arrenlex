"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

function RegistrarInquilinoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [nombre, setNombre] = useState("")
  const [celular, setCelular] = useState("")

  useEffect(() => {
    // Obtener email del usuario actual
    const getUserEmail = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        router.replace("/login")
      }
    }
    getUserEmail()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (!nombre.trim()) {
      setError("El nombre es requerido")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("No hay usuario autenticado")
      }

      // Actualizar contraseña del usuario
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw updateError
      }

      // Crear perfil en la tabla perfiles
      const { error: profileError } = await supabase
        .from("perfiles")
        .insert({
          id: user.id,
          email: user.email!,
          nombre: nombre.trim(),
          celular: celular.trim() || null,
          role: "inquilino",
          activo: true,
          bloqueado: false,
        })

      if (profileError) {
        console.error("Error creando perfil:", profileError)
        // Continuar aunque falle el perfil, el usuario ya tiene contraseña
      }

      // Redirigir al dashboard de inquilino
      router.replace("/inquilino/dashboard")
    } catch (err: any) {
      console.error("Error en registro:", err)
      setError(err?.message || "Error al registrar. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Completa tu Registro</CardTitle>
          <CardDescription>
            Eres un nuevo inquilino. Crea tu contraseña para acceder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Celular (opcional)
              </label>
              <input
                type="tel"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="300 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Contraseña *
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-800 border border-red-200 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div className="bg-blue-50 text-blue-800 border border-blue-200 rounded-lg p-3 text-sm">
              <p><strong>Importante:</strong> Tu cuenta será de tipo <strong>Inquilino</strong>.</p>
              <p className="mt-1">Podrás ver propiedades disponibles y tus pagos.</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Procesando..." : "Completar Registro"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegistrarInquilinoPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <RegistrarInquilinoContent />
    </Suspense>
  )
}
