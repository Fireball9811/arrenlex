import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

/**
 * GET - Devuelve el total de registros NO gestionados en arrenlex_form_intake.
 * Solo accesible para admin. Propietarios e inquilinos reciben { count: 0 }.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ count: 0 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin") {
    return NextResponse.json({ count: 0 })
  }

  const admin = createAdminClient()
  const { count, error } = await admin
    .from("arrenlex_form_intake")
    .select("id", { count: "exact", head: true })
    .eq("gestionado", false)

  if (error) {
    console.error("[intake count GET]", error)
    return NextResponse.json({ count: 0 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
