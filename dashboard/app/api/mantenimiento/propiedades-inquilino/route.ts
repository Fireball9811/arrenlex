import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Lista propiedades donde el inquilino tiene contrato activo (para selector en formulario).
 * Solo inquilino; otros roles reciben [].
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json([])
  }

  const role = await getUserRole(supabase, user)
  if (role !== "inquilino") {
    return NextResponse.json([])
  }

  const admin = createAdminClient()

  const { data: arrendatario } = await admin
    .from("arrendatarios")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!arrendatario) {
    return NextResponse.json([])
  }

  const { data: contratos } = await admin
    .from("contratos")
    .select("propiedad_id")
    .eq("arrendatario_id", arrendatario.id)
    .eq("estado", "activo")

  if (!contratos?.length) {
    return NextResponse.json([])
  }

  const propiedadIds = [...new Set(contratos.map((c) => c.propiedad_id))]
  const { data: propiedades } = await admin
    .from("propiedades")
    .select("id, direccion, ciudad, barrio")
    .in("id", propiedadIds)

  const list = (propiedades ?? []).map((p) => ({
    id: p.id,
    direccion: p.direccion,
    ciudad: p.ciudad,
    barrio: p.barrio ?? "",
  }))

  return NextResponse.json(list)
}
