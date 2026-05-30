import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole, type UserRole } from "@/lib/auth/role"

export type HabeasRouteContext = {
  userId: string
  role: UserRole
  admin: ReturnType<typeof createAdminClient>
}

export async function requireAdminOrPropietario(): Promise<
  { ok: true; ctx: HabeasRouteContext } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }

  const role = await getUserRole(supabase, user)
  if (role !== "admin" && role !== "propietario") {
    return { ok: false, response: NextResponse.json({ error: "Prohibido" }, { status: 403 }) }
  }

  return {
    ok: true,
    ctx: {
      userId: user.id,
      role,
      admin: createAdminClient(),
    },
  }
}
