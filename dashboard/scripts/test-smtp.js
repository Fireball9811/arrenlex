/**
 * Script de diagnóstico SMTP para Microsoft 365
 * Ejecutar desde carpeta dashboard: node scripts/test-smtp.js
 * Carga .env.local automáticamente.
 */

const fs = require("fs")
const path = require("path")
const nodemailer = require("nodemailer")

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

function getSmtpPass() {
  let pass = process.env.SMTP_PASS?.trim()
  if (pass) return pass
  const b64 = process.env.SMTP_PASS_B64?.trim()
  if (b64) {
    try {
      return Buffer.from(b64, "base64").toString("utf8")
    } catch (e) {
      console.error("Error decodificando SMTP_PASS_B64:", e.message)
      return null
    }
  }
  return null
}

async function main() {
  console.log("=== Diagnóstico SMTP Microsoft 365 ===\n")

  const host = process.env.SMTP_HOST ?? "smtp.office365.com"
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10)
  const user = process.env.SMTP_USER?.trim()
  const pass = getSmtpPass()
  const from = process.env.EMAIL_FROM ?? `Arrenlex <${user ?? "noreply@example.com"}>`

  console.log("Configuración cargada:")
  console.log("  SMTP_HOST:", host)
  console.log("  SMTP_PORT:", port)
  console.log("  SMTP_USER:", user ? user : "(no definido)")
  console.log("  SMTP_PASS:", pass ? `***${pass.slice(-2)} (${pass.length} caracteres)` : "(no definido o inválido)")
  console.log("  EMAIL_FROM:", from)
  console.log("")

  if (!user || !pass) {
    console.error("ERROR: SMTP_USER o SMTP_PASS (o SMTP_PASS_B64) no configurados en .env.local")
    process.exit(1)
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
    tls: { servername: host, rejectUnauthorized: true },
  })

  try {
    console.log("1. Verificando conexión SMTP (verify)...")
    await transporter.verify()
    console.log("   OK - Conexión y autenticación correctas.\n")
  } catch (err) {
    console.error("   FALLO - No se pudo conectar o autenticar:")
    console.error("   ", err.message)
    if (err.code) console.error("   Código:", err.code)
    if (err.response) console.error("   Respuesta servidor:", err.response)
    console.error("\nPosibles causas:")
    console.error("  - Contraseña incorrecta o contraseña de aplicación expirada")
    console.error("  - SMTP AUTH deshabilitado en Microsoft 365 (admin debe habilitarlo)")
    console.error("  - MFA activado: debes usar contraseña de aplicación, no la normal")
    console.error("  - Firewall bloqueando puerto 587")
    process.exit(1)
  }

  const testTo = process.env.SMTP_USER ?? user
  console.log("2. Enviando correo de prueba a:", testTo)
  try {
    const info = await transporter.sendMail({
      from,
      to: testTo,
      subject: "Prueba SMTP Arrenlex - " + new Date().toISOString(),
      text: "Si recibes este correo, la configuración SMTP de Microsoft 365 está funcionando correctamente.",
    })
    console.log("   OK - Mensaje enviado. MessageId:", info.messageId)
  } catch (err) {
    console.error("   FALLO al enviar:")
    console.error("   ", err.message)
    if (err.code) console.error("   Código:", err.code)
    if (err.response) console.error("   Respuesta:", err.response)
    process.exit(1)
  }

  console.log("\n=== Diagnóstico completado. Revisa tu bandeja de entrada (y spam). ===")
}

main().catch((e) => {
  console.error("Error:", e)
  process.exit(1)
})
