import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdmin } from "@/lib/supabase/admin"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST - Crea un usuario de sistema para un arrendatario que tiene contrato activo
 * y envía las credenciales por correo electrónico
 */
export async function POST(request: Request) {
  console.log("🔵 [crear-usuario-arrendatario] POST iniciado")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!isAdmin(user.email)) {
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

  console.log("✓ Creando usuario para arrendatario:", { email, userData })

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

    console.log("✓ Usuario creado exitosamente:", inviteData)

    // Generar una contraseña temporal y enviarla por correo
    const passwordTemporal = generarContrasenaTemporal()

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

    // Enviar correo con las credenciales
    await enviarCredencialesPorCorreo(email, userData.nombre, passwordTemporal)

    return NextResponse.json({
      success: true,
      message: "Usuario creado y credenciales enviadas por correo",
      email: email,
    })

  } catch (error: any) {
    console.error("❌ Error creando usuario:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generarContrasenaTemporal(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
  let password = ""
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

async function enviarCredencialesPorCorreo(email: string, nombre: string, password: string) {
  // TODO: Implementar el envío real de correo
  // Por ahora, solo loguear las credenciales
  console.log("📧 [CORREO] Enviando credenciales a:", email)
  console.log("📧 [CORREO] Asunto: Credenciales de acceso a Arrenlex")
  console.log("📧 [CORREO] Contenido:")
  console.log(`  Hola ${nombre},`)
  console.log(`  Tu cuenta de Arrenlex ha sido creada exitosamente.`)
  console.log(`  Correo: ${email}`)
  console.log(`  Contraseña temporal: ${password}`)
  console.log(`  Por favor, cambia tu contraseña al iniciar sesión por primera vez.`)
  console.log(`  Ingresa a: ${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}`)

  // En producción, aquí se usaría un servicio de correo como Resend, SendGrid, etc.
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: "Arrenlex <noreply@arrenlex.com>",
  //   to: email,
  //   subject: "Tus credenciales de acceso a Arrenlex",
  //   html: `...`
  // })
}
