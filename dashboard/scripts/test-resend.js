/**
 * Prueba envío de correo con Resend.
 * Ejecutar: node scripts/test-resend.js
 * Requiere RESEND_API_KEY en .env.local
 */

const fs = require("fs")
const path = require("path")

// Cargar .env.local
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8")
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  }
}

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim()
if (!RESEND_API_KEY) {
  console.error("ERROR: RESEND_API_KEY no está en .env.local")
  console.error("Crea una en resend.com/api-keys y ponla en .env.local")
  process.exit(1)
}

async function main() {
  const { Resend } = await import("resend")
  const resend = new Resend(RESEND_API_KEY)

  const to = process.env.EMAIL_TO_CEO || process.env.SMTP_USER || "ceo@arrenlex.com"
  console.log("Enviando correo de prueba a:", to)

  // Usar EMAIL_FROM si está configurado, sino usar onboarding@resend.dev
  const from = process.env.EMAIL_FROM || "Arrenlex <onboarding@resend.dev>"
  console.log("Enviando desde:", from)

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "Prueba Resend Arrenlex - " + new Date().toISOString(),
    html: "<p>Si recibes este correo, Resend está configurado correctamente. Ya no dependes de la contraseña de Microsoft.</p>",
  })

  if (error) {
    console.error("Error:", error.message)
    process.exit(1)
  }
  console.log("OK - Mensaje enviado. Id:", data?.id)
}

main()
