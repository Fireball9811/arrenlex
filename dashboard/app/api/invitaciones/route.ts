import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST - Enviar invitación por correo
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
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      )
    }

    // redirect_to debe coincidir EXACTAMENTE con Supabase → Redirect URLs (sin barra final, http en local).
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
    const redirectTo = `${siteUrl}/auth/callback`
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/ff442eb1-c8fb-4919-a950-d18bdf14310b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "api/invitaciones:POST",
        message: "sending OTP redirectTo",
        data: { redirectTo, siteUrl },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {})
    // #endregion
    if (!siteUrl.startsWith("http://") && siteUrl.includes("localhost")) {
      console.warn("[invitaciones] Para local, usa http://localhost:3000, no https.")
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      console.error("Error enviando invitación:", error)
      return NextResponse.json(
        { error: error.message || "Error al enviar invitación" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Invitación enviada exitosamente",
      email,
    })
  } catch (error) {
    console.error("Error en API de invitaciones:", error)
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}
