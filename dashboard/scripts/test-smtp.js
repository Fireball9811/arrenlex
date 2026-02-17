/**
 * Script de diagnóstico SMTP para Microsoft 365
 * Ejecutar desde carpeta dashboard: node scripts/test-smtp.js
 * Carga credenciales desde Supabase (tabla smtp_config) y .env.local automáticamente.
 */

const fs = require("fs")
const path = require("path")
const nodemailer = require("nodemailer")
const { createClient } = require("@supabase/supabase-js")
const crypto = require("crypto")

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

// Función de desencriptación (misma que lib/crypto.ts)
function decrypt(encrypted) {
  try {
    const SECRET_KEY = process.env.SMTP_ENCRYPTION_KEY || "change-this-key-in-production-32chars"
    const parts = encrypted.split(":")
    if (parts.length !== 2) {
      throw new Error("Formato inválido")
    }

    const iv = Buffer.from(parts[0], "hex")
    const encryptedText = parts[1]
    const key = crypto.scryptSync(SECRET_KEY, "salt", 32)

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)

    let decrypted = decipher.update(encryptedText, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (error) {
    console.error("Error desencriptando:", error.message)
    return null
  }
}

async function loadSmtpConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados")
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from("smtp_config")
    .select("*")
    .eq("active", true)
    .order("id", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error("Error cargando configuración SMTP:", error)
    return null
  }

  if (!data) {
    console.error("No hay configuración SMTP activa en smtp_config")
    console.error('Ejecuta "node scripts/setup-smtp.js --help" para configurar')
    return null
  }

  return data
}

async function main() {
  console.log("=== Diagnóstico SMTP Microsoft 365 ===\n")

  const config = await loadSmtpConfig()
  if (!config) {
    process.exit(1)
  }

  const password = decrypt(config.smtp_pass_encrypted)
  if (!password) {
    console.error("ERROR: No se pudo desencriptar la contraseña SMTP")
    console.error("Verifica que SMTP_ENCRYPTION_KEY en .env.local coincide con la usada al configurar")
    process.exit(1)
  }

  console.log("Configuración cargada desde Supabase:")
  console.log("  SMTP_HOST:", config.smtp_host)
  console.log("  SMTP_PORT:", config.smtp_port)
  console.log("  SMTP_USER:", config.smtp_user)
  console.log("  SMTP_PASS:", `***${password.slice(-2)} (${password.length} caracteres)`)
  console.log("  EMAIL_FROM:", config.email_from)
  console.log("")

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_port === 465,
    requireTLS: config.smtp_port === 587,
    auth: { user: config.smtp_user, pass: password },
    tls: { servername: config.smtp_host, rejectUnauthorized: true },
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

  const testTo = config.smtp_user
  console.log("2. Enviando correo de prueba a:", testTo)
  try {
    const info = await transporter.sendMail({
      from: config.email_from,
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
