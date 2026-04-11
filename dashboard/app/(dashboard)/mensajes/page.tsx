import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role"
import { getDashboardPathByRole } from "@/lib/auth/redirect-by-role"

export default async function MensajesRedirect() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user ? await getUserRole(supabase, user) : null

  if (role === "admin") redirect("/admin/mensajes")
  if (role === "propietario") redirect("/propietario/mensajes")
  redirect(role ? getDashboardPathByRole(role) : "/dashboard")
}
