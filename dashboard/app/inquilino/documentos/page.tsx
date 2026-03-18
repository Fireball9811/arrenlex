"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentosContrato } from "@/components/contratos/documentos-contrato"
import { useLang } from "@/lib/i18n/context"

export default function InquilinoDocumentosPage() {
  const { t } = useLang()
  const [contratoId, setContratoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Obtener el contrato del inquilino
    // Un inquilino debería tener un solo contrato activo
    const fetchContrato = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setError("No hay usuario autenticado")
          setLoading(false)
          return
        }

        // Buscar contratos donde el arrendatario tenga el mismo user_id
        const { data, error } = await supabase
          .from("contratos")
          .select(`
            id,
            arrendatario:arrendatarios!inner(
              user_id
            )
          `)
          .eq("arrendatario.user_id", user.id)
          .in("estado", ["activo", "terminado", "vencido"])
          .order("created_at", { ascending: false })
          .limit(1)

        if (error) throw error

        if (!data || data.length === 0) {
          setError("No se encontró un contrato activo")
        } else {
          setContratoId(data[0].id)
        }
      } catch (err) {
        console.error("Error obteniendo contrato:", err)
        setError("Error al obtener el contrato")
      } finally {
        setLoading(false)
      }
    }

    fetchContrato()
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Mis Documentos</h1>
        <p className="text-muted-foreground">Cargando documentos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Mis Documentos</h1>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>No hay documentos disponibles</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mis Documentos</h1>
        <p className="text-muted-foreground">
          Documentos adjuntos a tu contrato de arrendamiento
        </p>
      </div>

      {contratoId && (
        <DocumentosContrato
          contratoId={contratoId}
          puedeEditar={false} // Los inquilinos no pueden adjuntar documentos
        />
      )}
    </div>
  )
}
