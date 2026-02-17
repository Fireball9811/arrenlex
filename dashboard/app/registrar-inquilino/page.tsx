"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { FormularioDatosInquilino } from "@/components/inquilino/formulario-datos-inquilino"

function RegistrarInquilinoContent() {
  const router = useRouter()

  useEffect(() => {
    // Verificar que el usuario esté autenticado
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
      <FormularioDatosInquilino />
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
