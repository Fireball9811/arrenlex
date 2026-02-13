import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // Obtener el arrendatario del usuario actual
  const { data: arrendatario, error } = await supabase
    .from("arrendatarios")
    .select(`
      id,
      propiedad_id,
      valor_arriendo,
      propiedades (direccion)
    `)
    .eq("usuario_id", user.id)
    .eq("estado", "activo")
    .single()

  if (error || !arrendatario) {
    return NextResponse.json({ error: "No se encontró contrato activo" }, { status: 404 })
  }

  // Formatear la respuesta
  const respuesta = {
    id: arrendatario.id,
    propiedad_id: arrendatario.propiedad_id,
    propiedad_direccion: (arrendatario.propiedades as any)?.direccion,
    valor_arriendo: arrendatario.valor_arriendo,
  }

  return NextResponse.json(respuesta)
}
