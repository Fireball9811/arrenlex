"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function InquilinoMisDatosPage() {
  const router = useRouter()

  useEffect(() => {
    import("@/lib/supabase/client").then((m) => m.createClient()).then((supabase) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) router.replace("/login")
      })
    })
  }, [router])

  return (
    <div>
      <div className="mb-6">
        <Link href="/inquilino/dashboard" className="text-sm text-muted-foreground hover:underline">← Volver</Link>
        <h1 className="mt-2 text-3xl font-bold">Mis Datos</h1>
        <p className="text-muted-foreground">Actualiza tu información personal</p>
      </div>
      <p className="text-muted-foreground">Para completar o actualizar tu perfil de inquilino, usa el formulario de registro.</p>
      <Link href="/registrar-inquilino" className="mt-4 inline-block rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">Ir a completar registro</Link>
    </div>
  )
}
