"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function PropietarioInvitacionesPage() {
  const [email, setEmail] = useState("")
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
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: "success", text: `Invitación enviada a ${email}` })
        setEmail("")
      } else {
        setMessage({ type: "error", text: data.error || "Error al enviar invitación" })
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Invitaciones</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar Invitación
          </CardTitle>
          <CardDescription>El inquilino recibirá un correo con un enlace para registrarse.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendInvitation} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Correo del inquilino *</label>
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
              <div className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {message.text}
              </div>
            )}
            <Button type="submit" disabled={loading || !email}>
              {loading ? "Enviando..." : "Enviar Invitación"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
