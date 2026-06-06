"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOutUser } from "@/lib/auth/sign-out-client"

export function SignOutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    if (loading) return

    setLoading(true)
    setError(null)

    const result = await signOutUser()

    if (!result.success) {
      setError(result.error ?? "No se pudo cerrar la sesión")
      setLoading(false)
      return
    }

    router.push("/login")
    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="block w-full rounded p-2 text-left text-sm transition hover:bg-violet-800/80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Cerrando sesión…" : children}
      </button>
      {error && (
        <p className="mt-1 px-2 text-xs text-red-300">{error}</p>
      )}
    </div>
  )
}
