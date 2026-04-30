"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Loader2, CheckCircle, AlertCircle, Pencil } from "lucide-react"

type Message = { type: "success" | "error"; text: string }

interface GestionUsernameProps {
  currentUsername: string | null
  onSuccess?: () => void
}

export function GestionUsername({ currentUsername, onSuccess }: GestionUsernameProps) {
  const [showForm, setShowForm] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [saving, setSaving] = useState(false)

  // Verificar disponibilidad de username en tiempo real
  async function checkUsernameAvailability(username: string) {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    // Validar formato: solo letras, números, guiones y guiones bajos
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(username)) {
      setUsernameAvailable(false)
      return
    }

    setCheckingUsername(true)
    try {
      const response = await fetch(`/api/auth/update-username?username=${encodeURIComponent(username)}`)
      const data = await response.json()

      if (response.ok) {
        setUsernameAvailable(data.available)
      } else {
        setUsernameAvailable(false)
      }
    } catch {
      setUsernameAvailable(null)
    } finally {
      setCheckingUsername(false)
    }
  }

  // Manejar cambio de username
  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setSaving(true)

    try {
      const response = await fetch("/api/auth/update-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Error al cambiar el nombre de usuario" })
        setSaving(false)
        return
      }

      setMessage({
        type: "success",
        text: "Nombre de usuario actualizado correctamente."
      })

      // Limpiar formulario
      setNewUsername("")
      setUsernameAvailable(null)
      setShowForm(false)

      // Recargar después de 2 segundos
      setTimeout(() => {
        if (onSuccess) onSuccess()
        setMessage(null)
        window.location.reload()
      }, 2000)

    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Error al cambiar el nombre de usuario" })
    } finally {
      setSaving(false)
    }
  }

  // Validar formato del username
  function isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    return usernameRegex.test(username) && username.length >= 3 && username.length <= 30
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Nombre de Usuario
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!showForm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Tu nombre de usuario</p>
              <p className="text-sm text-muted-foreground">
                {currentUsername || "No has configurado tu nombre de usuario"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este es el nombre que se mostrará en la aplicación
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Cambiar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleChangeUsername} className="space-y-4">
            <div>
              <Label htmlFor="newUsername">Nuevo nombre de usuario *</Label>
              <div className="relative">
                <Input
                  id="newUsername"
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value)
                    checkUsernameAvailability(e.target.value)
                  }}
                  placeholder="Ej: Luis, Maria123, juan_perez"
                  pattern="[a-zA-Z0-9_-]+"
                  className="pr-10"
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>

              {usernameAvailable === false && newUsername.length >= 3 && (
                <p className="text-sm text-red-500 mt-1">
                  Este nombre de usuario ya está en uso. Elige otro.
                </p>
              )}

              {newUsername && !isValidUsername(newUsername) && (
                <p className="text-sm text-red-500 mt-1">
                  Solo letras, números, guiones (-) y guiones bajos (_). Mínimo 3 caracteres.
                </p>
              )}
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Reglas para el nombre de usuario:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Debe tener entre 3 y 30 caracteres</li>
                <li>Solo puede contener letras, números, guiones (-) y guiones bajos (_)</li>
                <li>Debe ser único (nadie más puede tener el mismo)</li>
              </ul>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={saving || !usernameAvailable || checkingUsername || !newUsername || !isValidUsername(newUsername)}
              >
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                ) : "Guardar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setNewUsername("")
                  setUsernameAvailable(null)
                  setMessage(null)
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
