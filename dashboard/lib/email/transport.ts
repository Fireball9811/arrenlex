import nodemailer from "nodemailer"

let transporter: nodemailer.Transporter | null = null

/**
 * Crea el transporte SMTP para Gmail usando nodemailer.
 * Requiere: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 * Ver GOOGLE_SMTP_SETUP.md para configurar Google.
 */
export function getEmailTransport(): nodemailer.Transporter | null {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST ?? "smtp.gmail.com"
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    console.error("[email] SMTP_USER o SMTP_PASS no configurados. Revisa .env.local y GOOGLE_SMTP_SETUP.md")
    return null
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return transporter
}
