/**
 * Script para configurar las credenciales SMTP en Supabase.
 * Encripta la contraseña antes de guardarla en la tabla smtp_config.
 *
 * Uso:
 *   node scripts/setup-smtp.js --user ceo@arrenlex.com --pass "app-password"
 *   node scripts/setup-smtp.js --user ceo@arrenlex.com --pass "app-password" --from "Arrenlex <ceo@arrenlex.com>"
 *   node scripts/setup-smtp.js --list  (muestra configuraciones existentes)
 *   node scripts/setup-smtp.js --delete 3  (elimina configuración con id 3)
 */

const fs = require("fs")
const path = require("path")
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

// Funciones de encriptación (mismas que lib/crypto.ts)
function encrypt(text) {
  const SECRET_KEY = process.env.SMTP_ENCRYPTION_KEY || "change-this-key-in-production-32chars"
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(SECRET_KEY, "salt", 32)
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  return iv.toString("hex") + ":" + encrypted
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados")
    process.exit(1)
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

async function listConfigs(supabase) {
  const { data, error } = await supabase
    .from("smtp_config")
    .select("id, smtp_host, smtp_port, smtp_user, email_from, active, created_at")
    .order("id", { ascending: false })

  if (error) {
    console.error("Error consultando configuraciones:", error)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log("\nNo hay configuraciones SMTP guardadas.\n")
    return
  }

  console.log("\n=== Configuraciones SMTP ===\n")
  for (const config of data) {
    console.log(`ID: ${config.id}`)
    console.log(`  Host: ${config.smtp_host}:${config.smtp_port}`)
    console.log(`  User: ${config.smtp_user}`)
    console.log(`  From: ${config.email_from}`)
    console.log(`  Active: ${config.active ? "SÍ" : "NO"}`)
    console.log(`  Creado: ${new Date(config.created_at).toLocaleString()}`)
    console.log("")
  }
}

async function createConfig(supabase, user, pass, from, host, port) {
  const encrypted = encrypt(pass)

  const { data, error } = await supabase
    .from("smtp_config")
    .insert({
      smtp_host: host || "smtp.office365.com",
      smtp_port: port || 587,
      smtp_user: user,
      smtp_pass_encrypted: encrypted,
      email_from: from || `Arrenlex <${user}>`,
      active: true,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error creando configuración:", error)
    process.exit(1)
  }

  console.log(`\n✓ Configuración SMTP creada con ID: ${data.id}`)
  console.log(`  Host: ${host || "smtp.office365.com"}:${port || 587}`)
  console.log(`  User: ${user}`)
  console.log(`  From: ${from || `Arrenlex <${user}>`}`)
  console.log("\nLa contraseña ha sido encriptada y guardada en Supabase.\n")
}

async function deleteConfig(supabase, id) {
  const { error } = await supabase
    .from("smtp_config")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error eliminando configuración:", error)
    process.exit(1)
  }

  console.log(`\n✓ Configuración SMTP con ID ${id} eliminada.\n`)
}

async function main() {
  const args = process.argv.slice(2)

  // Parse argumentos
  const params = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--user") params.user = args[++i]
    else if (args[i] === "--pass") params.pass = args[++i]
    else if (args[i] === "--from") params.from = args[++i]
    else if (args[i] === "--host") params.host = args[++i]
    else if (args[i] === "--port") params.port = parseInt(args[++i])
    else if (args[i] === "--list") params.list = true
    else if (args[i] === "--delete") params.delete = parseInt(args[++i])
  }

  const supabase = getSupabaseAdmin()

  // Listar configuraciones
  if (params.list) {
    await listConfigs(supabase)
    return
  }

  // Eliminar configuración
  if (params.delete) {
    await deleteConfig(supabase, params.delete)
    return
  }

  // Crear configuración
  if (!params.user || !params.pass) {
    console.log(`
Uso: node scripts/setup-smtp.js [opciones]

Opciones:
  --user <email>       Usuario SMTP (ej: ceo@arrenlex.com) [OBLIGATORIO]
  --pass <password>    Contraseña de aplicación (o normal) [OBLIGATORIO]
  --from <email>       Email remitente (opcional, por defecto usa --user)
  --host <host>        Servidor SMTP (opcional, por defecto: smtp.office365.com)
  --port <puerto>      Puerto SMTP (opcional, por defecto: 587)
  --list               Lista todas las configuraciones guardadas
  --delete <id>        Elimina una configuración por su ID

Ejemplos:
  node scripts/setup-smtp.js --user ceo@arrenlex.com --pass "mi-password"
  node scripts/setup-smtp.js --user ceo@arrenlex.com --pass "mi-password" --from "Arrenlex <ceo@arrenlex.com>"
  node scripts/setup-smtp.js --list
`)
    process.exit(1)
  }

  await createConfig(supabase, params.user, params.pass, params.from, params.host, params.port)
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
