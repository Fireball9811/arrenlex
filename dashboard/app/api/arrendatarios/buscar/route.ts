import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buscarArrendatarioEnScope } from "@/lib/auth/resource-access"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/arrendatarios/buscar?nombre=xxx&cedula=yyy
 * Admin: búsqueda global. Propietario: solo arrendatarios de sus contratos.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const nombre = searchParams.get("nombre")
  const cedula = searchParams.get("cedula")

  if (!cedula?.trim() && !nombre?.trim()) {
    return NextResponse.json({ error: "Indica nombre o cédula" }, { status: 400 })
  }

  const admin = createAdminClient()
  const arrendatario = await buscarArrendatarioEnScope(admin, role, user.id, {
    nombre,
    cedula,
  })

  if (!arrendatario) {
    return NextResponse.json({ email: null })
  }

  return NextResponse.json({ email: arrendatario.email, arrendatario })
}
