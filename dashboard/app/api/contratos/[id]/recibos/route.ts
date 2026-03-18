import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

// GET - Listar recibos de un contrato específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id
  console.log("🔵 [recibos-contrato] GET - contrato:", contratoId)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("❌ No hay usuario autenticado")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Obtener el rol del usuario
  const role = await getUserRole(supabase, user)
  console.log("✓ Rol:", role)

  const admin = createAdminClient()

  // Primero obtener el contrato para saber la propiedad_id
  const { data: contrato, error: contratoError } = await admin
    .from("contratos")
    .select("id, propiedad_id, user_id, arrendatario_id, arrendatario:arrendatarios!inner(id, user_id)")
    .eq("id", contratoId)
    .single()

  if (contratoError || !contrato) {
    console.log("❌ Contrato no encontrado")
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  // Verificar permisos
  let tieneAcceso = role === "admin"

  if (!tieneAcceso && role === "propietario") {
    tieneAcceso = contrato.user_id === user.id
  }

  if (!tieneAcceso && role === "inquilino") {
    const arrendatario = Array.isArray(contrato.arrendatario) ? contrato.arrendatario[0] : contrato.arrendatario
    tieneAcceso = arrendatario?.user_id === user.id
  }

  if (!tieneAcceso) {
    console.log("❌ Sin acceso al contrato")
    return NextResponse.json({ error: "No tienes acceso a este contrato" }, { status: 403 })
  }

  // Ahora buscar recibos por propiedad_id del contrato
  const { data: recibos, error } = await admin
    .from("recibos_pago")
    .select("*")
    .eq("propiedad_id", contrato.propiedad_id)
    .order("fecha_recibo", { ascending: false })

  if (error) {
    console.error("❌ Error obteniendo recibos:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log("✓ Recibos encontrados:", recibos?.length || 0)
  return NextResponse.json(recibos ?? [])
}
