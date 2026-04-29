import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET /api/arrendatarios/buscar?nombre=xxx
 * Busca un arrendatario por nombre y devuelve su email
 * Accesible para admin y propietario
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

  const admin = createAdminClient()

  // Búsqueda por cédula (exacta) si viene — más fiable tras editar el recibo
  if (cedula && cedula.trim() !== "") {
    const { data: porCedula, error: errCedula } = await admin
      .from("arrendatarios")
      .select("id, email, nombre, cedula")
      .eq("cedula", cedula.trim())
      .limit(1)

    if (errCedula) {
      return NextResponse.json({ error: errCedula.message }, { status: 500 })
    }
    if (porCedula && porCedula.length > 0) {
      return NextResponse.json({ email: porCedula[0].email, arrendatario: porCedula[0] })
    }
    // Sin coincidencia por cédula y sin nombre → no hay más que buscar
    if (!nombre?.trim()) {
      return NextResponse.json({ email: null })
    }
  }

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "Indica nombre o cédula" }, { status: 400 })
  }

  // Buscar arrendatario por nombre
  const { data, error } = await admin
    .from("arrendatarios")
    .select("id, email, nombre, cedula")
    .ilike("nombre", `%${nombre.trim()}%`)
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ email: null })
  }

  return NextResponse.json({ email: data[0].email, arrendatario: data[0] })
}
