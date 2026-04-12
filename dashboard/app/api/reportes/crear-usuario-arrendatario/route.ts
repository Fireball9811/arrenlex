import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminRole } from "@/lib/auth/role"

/**
 * POST - Crea un usuario de sistema para un arrendatario que tiene contrato activo
 * y envía las credenciales por correo electrónico
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!(await isAdminRole(supabase, user.id))) {
    return NextResponse.json({ error: "Solo administradores pueden realizar esta acción" }, { status: 403 })
  }

  const body = await request.json()
  const { arrendatarioId, email, nombre, cedula, celular } = body

  if (!arrendatarioId || !email) {
    return NextResponse.json({ error: "arrendatarioId y email son requeridos" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar que el arrendatario existe y tiene contrato activo
  const { data: arrendatario, error: errorArrendatario } = await admin
    .from("arrendatarios")
    .select("id, nombre, cedula, email, celular")
    .eq("id", arrendatarioId)
    .single()

  if (errorArrendatario || !arrendatario) {
    return NextResponse.json({ error: "Arrendatario no encontrado" }, { status: 404 })
  }

  // Verificar que tiene contrato activo
  const { data: contrato, error: errorContrato } = await admin
    .from("contratos")
    .select("id, estado")
    .eq("arrendatario_id", arrendatarioId)
    .eq("estado", "activo")
    .single()

  if (errorContrato || !contrato) {
    return NextResponse.json({ error: "El arrendatario no tiene un contrato activo" }, { status: 400 })
  }

  // Verificar si ya existe un usuario con ese email
  const { data: usuarioExistente } = await admin
    .from("perfiles")
    .select("id, email")
    .eq("email", email)
    .single()

  if (usuarioExistente) {
    return NextResponse.json({ error: "Ya existe un usuario con ese correo electrónico" }, { status: 400 })
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  const redirectTo = `${siteUrl}/auth/callback`
  const userData = {
    role: "inquilino",
    nombre: nombre || arrendatario.nombre,
    cedula: cedula || arrendatario.cedula,
    celular: celular || arrendatario.celular,
    arrendatarioId: arrendatarioId,
  }

  try {
    // Crear el usuario usando el sistema de invitaciones de Supabase
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo, data: userData }
    )

    if (inviteError) {
      console.error("❌ Error creando usuario:", inviteError)
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    // Obtener el ID del usuario creado desde auth.users
    let nuevoUserId: string | null = null
    if (inviteData?.user?.id) {
      nuevoUserId = inviteData.user.id
    } else {
      const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const nuevoUser = usersList?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      nuevoUserId = nuevoUser?.id || null
    }

    // Actualizar el perfil con los datos adicionales
    const { error: updateError } = await admin
      .from("perfiles")
      .update({
        nombre: userData.nombre,
        cedula: userData.cedula,
        celular: userData.celular,
      })
      .eq("email", email)

    if (updateError) {
      console.error("⚠️ Error actualizando perfil:", updateError)
    }

    // Vincular el user_id con el arrendatario
    if (nuevoUserId) {
      const { error: updateArrendatarioError } = await admin
        .from("arrendatarios")
        .update({ user_id: nuevoUserId })
        .eq("id", arrendatarioId)

      if (updateArrendatarioError) {
        console.error("⚠️ Error vinculando user_id con arrendatario:", updateArrendatarioError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Usuario creado y correo de invitación enviado",
      email: email,
    })

  } catch (error: any) {
    console.error("❌ Error creando usuario:", error)
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
  }
}

function generarContrasenaTemporal(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
  const array = new Uint32Array(12)
  crypto.getRandomValues(array)
  return Array.from(array).map(n => chars[n % chars.length]).join("")
}
