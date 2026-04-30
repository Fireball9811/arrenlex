"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Key, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

type Message = { type: "success" | "error"; text: string }

interface GestionCredencialesProps {
  currentEmail: string
  onSuccess?: () => void
}

export function GestionCredenciales({ currentEmail, onSuccess }: GestionCredencialesProps) {
  // Estados para cambio de email
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailPassword, setEmailPassword] = useState("")
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [showEmailPassword, setShowEmailPassword] = useState(false)
  const [emailMessage, setEmailMessage] = useState<Message | null>(null)
  const [emailSaving, setEmailSaving] = useState(false)

  // Estados para cambio de contraseña
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<Message | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Verificar disponibilidad de email en tiempo real
  async function checkEmailAvailability(email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null)
      return
    }

    setCheckingEmail(true)
    try {
      const response = await fetch(`/api/auth/update-email?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      setEmailAvailable(data.available)
    } catch {
      setEmailAvailable(null)
    } finally {
      setCheckingEmail(false)
    }
  }

  // Manejar cambio de email
  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailMessage(null)
    setEmailSaving(true)

    try {
      // Verificar contraseña actual
      const responseVerify = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentEmail,
          password: emailPassword,
        }),
      })

      if (!responseVerify.ok) {
        setEmailMessage({ type: "error", text: "La contraseña actual es incorrecta" })
        setEmailSaving(false)
        return
      }

      // Cambiar email
      const response = await fetch("/api/auth/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        setEmailMessage({ type: "error", text: data.error || "Error al cambiar el email" })
        setEmailSaving(false)
        return
      }

      setEmailMessage({
        type: "success",
        text: data.details || "Email actualizado. Revisa tu correo para verificarlo."
      })

      // Limpiar formulario
      setNewEmail("")
      setEmailPassword("")
      setEmailAvailable(null)
      setShowEmailForm(false)

      // Recargar después de 3 segundos
      setTimeout(() => {
        if (onSuccess) onSuccess()
        setEmailMessage(null)
        // Recargar la página para actualizar el email mostrado
        window.location.reload()
      }, 3000)

    } catch (error: any) {
      setEmailMessage({ type: "error", text: error?.message || "Error al cambiar el email" })
    } finally {
      setEmailSaving(false)
    }
  }

  // Manejar cambio de contraseña
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMessage(null)
    setPasswordSaving(true)

    try {
      // Validar contraseñas coinciden
      if (newPassword !== confirmPassword) {
        setPasswordMessage({ type: "error", text: "Las contraseñas no coinciden" })
        setPasswordSaving(false)
        return
      }

      // Validar longitud
      if (newPassword.length < 8) {
        setPasswordMessage({ type: "error", text: "La contraseña debe tener al menos 8 caracteres" })
        setPasswordSaving(false)
        return
      }

      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPasswordMessage({ type: "error", text: data.error || "Error al cambiar la contraseña" })
        setPasswordSaving(false)
        return
      }

      setPasswordMessage({
        type: "success",
        text: "Contraseña actualizada correctamente"
      })

      // Limpiar formulario
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordForm(false)

      setTimeout(() => setPasswordMessage(null), 3000)

    } catch (error: any) {
      setPasswordMessage({ type: "error", text: error?.message || "Error al cambiar la contraseña" })
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Correo Electrónico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showEmailForm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email de inicio de sesión</p>
                <p className="text-sm text-muted-foreground">{currentEmail}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEmailForm(true)}
              >
                Cambiar email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <h4 className="font-medium">Cambiar correo electrónico</h4>

              <div>
                <Label htmlFor="newEmail">Nuevo correo electrónico *</Label>
                <div className="relative">
                  <Input
                    id="newEmail"
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value)
                      checkEmailAvailability(e.target.value)
                    }}
                    placeholder="nuevo@correo.com"
                    className="pr-10"
                  />
                  {checkingEmail && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!checkingEmail && emailAvailable === true && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {!checkingEmail && emailAvailable === false && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                  )}
                </div>
                {emailAvailable === false && (
                  <p className="text-sm text-red-500 mt-1">
                    Este email ya está en uso. Debes elegir otro.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="emailPassword">Contraseña actual (para confirmar) *</Label>
                <div className="relative">
                  <Input
                    id="emailPassword"
                    type={showEmailPassword ? "text" : "password"}
                    required
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {emailMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  emailMessage.type === "success"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}>
                  {emailMessage.text}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={emailSaving || !emailAvailable || checkingEmail || !newEmail || !emailPassword}
                >
                  {emailSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                  ) : "Confirmar cambio"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEmailForm(false)
                    setNewEmail("")
                    setEmailPassword("")
                    setEmailAvailable(null)
                    setEmailMessage(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Nota: Se enviará un email de verificación a tu nuevo correo. Debes hacer clic en el enlace para completar el cambio.
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Contraseña */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Contraseña de inicio de sesión</p>
                <p className="text-sm text-muted-foreground">Cambiar tu contraseña</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordForm(true)}
              >
                Cambiar contraseña
              </Button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h4 className="font-medium">Cambiar contraseña</h4>

              <div>
                <Label htmlFor="currentPassword">Contraseña actual *</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">Nueva contraseña *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar nueva contraseña *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu nueva contraseña"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  passwordMessage.type === "success"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}>
                  {passwordMessage.text}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
                >
                  {passwordSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                  ) : "Actualizar contraseña"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setCurrentPassword("")
                    setNewPassword("")
                    setConfirmPassword("")
                    setPasswordMessage(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
