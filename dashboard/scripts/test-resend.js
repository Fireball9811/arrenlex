/**
 * Script de prueba para Resend
 * Ejecutar desde carpeta dashboard: node scripts/test-resend.js
 * Carga RESEND_API_KEY desde .env.local automáticamente.
 */

const fs = require("fs")
const path = require("path")
const { Resend } = require("resend")

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

async function main() {
  console.log("=== Prueba de Resend ===\n")

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("ERROR: RESEND_API_KEY no encontrada en .env.local")
    console.error("\nAgrega esto a tu archivo .env.local:")
    console.error('RESEND_API_KEY=re_xxxxxxxxxxxxxx')
    console.error("\nObtén tu API key en: https://resend.com/api-keys")
    process.exit(1)
  }

  console.log("Configuración:")
  console.log("  API Key:", apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 4))
  console.log("  From:", process.env.EMAIL_FROM || "Arrenlex <ceo@arrenlex.com>")
  console.log("")

  const resend = new Resend(apiKey)
  const testTo = "ceo@arrenlex.com"

  console.log(`1. Enviando correo de prueba a: ${testTo}`)

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Arrenlex <ceo@arrenlex.com>",
      to: testTo,
      subject: "Prueba de Resend - " + new Date().toISOString(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333;">
  <h1>¡Resend funciona!</h1>
  <p>Si recibes este correo, la configuración de Resend está correcta.</p>
  <p><strong>Fecha de envío:</strong> ${new Date().toLocaleString()}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.875rem; color: #999;">Arrenlex - Prueba de Resend</p>
</body>
</html>
      `.trim(),
    })

    if (error) {
      console.error("   FALLO al enviar:")
      console.error("   ", error.message)
      if (error.name) console.error("   Nombre:", error.name)
      if (error.statusCode) console.error("   Status:", error.statusCode)
      console.error("\nPosibles causas:")
      console.error("  - API key inválida o expirada")
      console.error("  - Dominio no verificado en Resend")
      console.error("  - Email remitente no configurado en Resend")
      process.exit(1)
    }

    console.log("   OK - Mensaje enviado.")
    console.log("   Message ID:", data?.id)
    console.log("")
    console.log("=== Prueba completada. Revisa tu bandeja de entrada (y spam). ===")
  } catch (err) {
    console.error("   FALLO al enviar:")
    console.error("   ", err.message)
    if (err.code) console.error("   Código:", err.code)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("Error:", e)
  process.exit(1)
})
