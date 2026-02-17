import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdmin } from "@/lib/supabase/admin"

// GET - Listar todos los usuarios (solo admin)
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Obtener todos los perfiles de usuarios
  const { data: perfiles, error } = await admin
    .from("perfiles")
    .select("*")
    .order("creado_en", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(perfiles ?? [])
}

// POST - Invitar nuevo usuario (solo admin)
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
  const {
    email,
    role = "inquilino",
    nombre,
    celular,
    cedula,
    cedula_lugar_expedicion,
    direccion,
  } = body

  if (!email?.trim()) {
    return NextResponse.json({ error: "El correo es obligatorio" }, { status: 400 })
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  const redirectTo = `${siteUrl}/auth/callback`
  const admin = createAdminClient()
  const userData = { role, nombre }

  // Logging para diagnóstico
  console.log("[inviteUserByEmail] Enviando invitación a:", email.trim())
  console.log("[inviteUserByEmail] redirectTo:", redirectTo)
  console.log("[inviteUserByEmail] siteUrl:", siteUrl)
  console.log("[inviteUserByEmail] userData:", userData)

  try {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      email.trim(),
      { redirectTo, data: userData }
    )

    if (error) {
      console.error("[inviteUserByEmail] Error de Supabase:", error)
      const msg = error.message.toLowerCase()

      // Usuario ya registrado
      if (
        msg.includes("user already registered") ||
        msg.includes("user already exists") ||
        msg.includes("already been registered") ||
        error.status === 400 && msg.includes("already")
      ) {
        return NextResponse.json(
          { error: `El correo ${email.trim()} ya está registrado en el sistema.` },
          { status: 400 }
        )
      }

      // Rate limiting
      if (
        msg.includes("rate limit") ||
        msg.includes("rate_limit") ||
        msg.includes("email rate limit")
      ) {
        return NextResponse.json(
          {
            error:
              "Límite temporal de emails alcanzado. Espera unos minutos o configura SMTP custom en Supabase (Settings → Authentication → Email Templates → Custom SMTP).",
          },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (data.user?.id) {
      const perfilUpdates: Record<string, string | null> = {}
      if (typeof nombre === "string" && nombre.trim()) perfilUpdates.nombre = nombre.trim()
      if (typeof celular === "string") perfilUpdates.celular = celular.trim() || null
      if (typeof cedula === "string") perfilUpdates.cedula = cedula.trim() || null
      if (typeof cedula_lugar_expedicion === "string")
        perfilUpdates.cedula_lugar_expedicion = cedula_lugar_expedicion.trim() || null
      if (typeof direccion === "string") perfilUpdates.direccion = direccion.trim() || null
      if (Object.keys(perfilUpdates).length > 0) {
        await admin
          .from("perfiles")
          .update(perfilUpdates)
          .eq("id", data.user.id)
      }
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
