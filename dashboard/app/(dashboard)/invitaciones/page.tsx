"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Mail, Send, CheckCircle, AlertCircle } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

export default function InvitacionesPage() {
  const { t } = useLang()
  const [email, setEmail] = useState("")
  const [nombre, setNombre] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function sendInvitation(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/invitaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nombre: nombre.trim() || undefined }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: "success", text: `Invitación enviada a ${email}` })
        setEmail("")
        setNombre("")
      } else {
        setMessage({ type: "error", text: data.error || "Error al enviar invitación" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.invitaciones.titulo}</h1>
        <p className="text-muted-foreground">
          {t.invitaciones.descripcion}
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t.invitaciones.cardTitulo}
          </CardTitle>
          <CardDescription>
            {t.invitaciones.cardDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendInvitation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t.invitaciones.nombreLabel}
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Juan Pérez García"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t.invitaciones.emailLabel}
              </label>
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {message && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                {t.invitaciones.cardDesc2}
              </p>
            </div>

            <Button type="submit" disabled={loading || !email || !nombre.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? t.invitaciones.enviando : t.invitaciones.enviar}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
