import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateTempPassword } from "@/lib/auth/temp-password"
import { sendInvitationEmail } from "@/lib/email/send-invitation"

const EXPIRY_DAYS =
  parseInt(process.env.INVITATION_TEMP_PASSWORD_EXPIRY_DAYS ?? "7", 10) || 7

// POST - Invitar usuario con contraseña temporal
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      email,
      nombre: bodyNombre,
      celular: bodyCelular,
      cedula: bodyCedula,
      cedula_lugar_expedicion: bodyCedulaLugar,
      direccion: bodyDireccion,
    } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 }
      )
    }

    const emailTrimmed = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTrimmed)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      )
    }

    let admin
    try {
      admin = createAdminClient()
    } catch {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY no configurada. Revisa las variables de entorno." },
        { status: 500 }
      )
    }

    const tempPassword = generateTempPassword()
    const tempPasswordExpiresAt =
      Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000

    const { data: newUser, error: createError } =
      await admin.auth.admin.createUser({
        email: emailTrimmed,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          must_change_password: true,
          temp_password_expires_at: tempPasswordExpiresAt,
        },
      })

    if (createError) {
      const isAlreadyRegistered =
        createError.message?.toLowerCase().includes("already") ||
        createError.message?.toLowerCase().includes("registered")

      if (isAlreadyRegistered) {
        const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const existingUser = listData.users.find(
          (u) => u.email?.toLowerCase() === emailTrimmed
        )
        if (!existingUser) {
          return NextResponse.json(
            { error: "Este correo ya tiene cuenta" },
            { status: 400 }
          )
        }

        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "invitaciones/route.ts:reinvite_before_update",
            message: "Re-invitación: usuario existente, email_confirmed_at",
            data: {
              email: emailTrimmed,
              userId: existingUser.id,
              email_confirmed_at: (existingUser as { email_confirmed_at?: string }).email_confirmed_at ?? null,
              hypothesisId: "H1",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion
        const { error: updateError } = await admin.auth.admin.updateUserById(
          existingUser.id,
          {
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              must_change_password: true,
              temp_password_expires_at: tempPasswordExpiresAt,
            },
          }
        )
        if (updateError) {
          console.error("[invitaciones] Error actualizando usuario:", updateError)
          return NextResponse.json(
            { error: updateError.message || "Error al actualizar usuario" },
            { status: 500 }
          )
        }

        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://arrenlex.com").replace(/\/$/, "")
        const loginUrl = `${siteUrl}/login`
        const emailResult = await sendInvitationEmail({
          to: emailTrimmed,
          tempPassword,
          loginUrl,
          expiresInDays: EXPIRY_DAYS,
        })
        if (!emailResult.success) {
          console.error("[invitaciones] Error enviando email:", emailResult.error)
          return NextResponse.json(
            { error: emailResult.error || "Contraseña actualizada pero no se pudo enviar el correo" },
            { status: 500 }
          )
        }
        return NextResponse.json({
          success: true,
          message: "Re-invitación enviada exitosamente",
          email: emailTrimmed,
        })
      }

      console.error("[invitaciones] Error creando usuario:", createError)
      return NextResponse.json(
        { error: createError.message || "Error al crear usuario" },
        { status: 500 }
      )
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: "Error al crear usuario" },
        { status: 500 }
      )
    }

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "invitaciones/route.ts:new_user_created",
        message: "Nuevo usuario creado, email_confirmed_at",
        data: {
          email: emailTrimmed,
          userId: newUser.user.id,
          email_confirmed_at: (newUser.user as { email_confirmed_at?: string }).email_confirmed_at ?? null,
          hypothesisId: "H3",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    const nombreFinal =
      typeof bodyNombre === "string" && bodyNombre.trim()
        ? bodyNombre.trim()
        : newUser.user.email?.split("@")[0] || "Inquilino"

    const { error: perfilError } = await admin
      .from("perfiles")
      .insert({
        id: newUser.user.id,
        email: newUser.user.email!,
        nombre: nombreFinal,
        role: "inquilino",
        activo: true,
        bloqueado: false,
        celular: typeof bodyCelular === "string" ? bodyCelular.trim() || null : null,
        cedula: typeof bodyCedula === "string" ? bodyCedula.trim() || null : null,
        cedula_lugar_expedicion:
          typeof bodyCedulaLugar === "string" ? bodyCedulaLugar.trim() || null : null,
        direccion: typeof bodyDireccion === "string" ? bodyDireccion.trim() || null : null,
      })

    if (perfilError) {
      console.error("[invitaciones] Error insertando perfil:", perfilError)
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://arrenlex.com").replace(
      /\/$/,
      ""
    )
    const loginUrl = `${siteUrl}/login`
    const emailResult = await sendInvitationEmail({
      to: emailTrimmed,
      tempPassword,
      loginUrl,
      expiresInDays: EXPIRY_DAYS,
    })
    if (!emailResult.success) {
      console.error("[invitaciones] Error enviando email:", emailResult.error)
      return NextResponse.json(
        { error: emailResult.error || "Usuario creado pero no se pudo enviar el correo" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Invitación enviada exitosamente",
      email: emailTrimmed,
    })
  } catch (error) {
    console.error("Error en API de invitaciones:", error)
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}
