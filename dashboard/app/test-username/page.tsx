"use client"

import { useState } from "react"

export default function TestUsernamePage() {
  const [username, setUsername] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function checkStatus() {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/fix-username")
      const data = await response.json()
      setResult({ type: "status", data })
    } catch (error: any) {
      setResult({ type: "error", message: error.message })
    }
    setLoading(false)
  }

  async function updateUsername() {
    if (!username) return

    setLoading(true)
    try {
      const response = await fetch("/api/auth/fix-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      })
      const data = await response.json()
      setResult({ type: "update", data })
    } catch (error: any) {
      setResult({ type: "error", message: error.message })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Test de Username</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">1. Verificar Estado</h2>
          <button
            onClick={checkStatus}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Verificar mi estado"}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">2. Actualizar Username</h2>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ej: Luis"
            className="border rounded px-3 py-2 w-full mb-4"
          />
          <button
            onClick={updateUsername}
            disabled={loading || !username}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Actualizar Username"}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Resultado</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
