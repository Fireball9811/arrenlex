"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { FormularioDatosInquilino } from "@/components/inquilino/formulario-datos-inquilino"

function InquilinoMisDatosContent() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link href="/inquilino/dashboard" className="text-sm text-muted-foreground hover:underline">← Volver</Link>
      </div>
      <FormularioDatosInquilino />
    </div>
  )
}

export default function InquilinoMisDatosPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <InquilinoMisDatosContent />
    </Suspense>
  )
}
