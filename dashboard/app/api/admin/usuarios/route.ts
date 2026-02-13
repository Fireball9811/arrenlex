import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdmin } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado", admin: false }, { status: 401 })
  }

  if (!isAdmin(user.email)) {
    return NextResponse.json(
      {
        error: "Acceso denegado",
        admin: false,
        userEmail: user.email ?? undefined,
      },
      { status: 403 }
    )
  }

  return NextResponse.json({ admin: true })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 })
  }

  const body = await request.json()
  const { email } = body

  if (!email?.trim()) {
    return NextResponse.json({ error: "El correo es obligatorio" }, { status: 400 })
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  const redirectTo = `${siteUrl}/auth/callback`
  const admin = createAdminClient()
  const userData = { rol: "inquilino" as const }

  try {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      email.trim(),
      { redirectTo, data: userData }
    )

    if (error) {
      const msg = error.message.toLowerCase()
      if (
        msg.includes("rate limit") ||
        msg.includes("rate_limit") ||
        msg.includes("email rate limit")
      ) {
        return NextResponse.json(
          {
            error:
              "Límite temporal de envío alcanzado. Intenta de nuevo en unos minutos (Supabase SMTP).",
          },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      id: data.user?.id,
      email: data.user?.email,
      message: "Invitación enviada por correo. El usuario debe hacer clic en el enlace para crear su contraseña e ingresar.",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al crear usuario" },
      { status: 500 }
    )
  }
}
