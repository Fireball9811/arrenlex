/**
 * Funciones de encriptación/desencriptación para credenciales sensibles.
 * Usa AES-256-CBC con clave desde SMTP_ENCRYPTION_KEY en .env.local.
 */

import crypto from "crypto"

const SECRET_KEY = process.env.SMTP_ENCRYPTION_KEY || "change-this-key-in-production-32chars"

/**
 * Encripta un texto usando AES-256-CBC.
 * Formato de salida: iv_hex:encrypted_hex
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(SECRET_KEY, "salt", 32)
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  return iv.toString("hex") + ":" + encrypted
}

/**
 * Desencripta un texto encriptado con encrypt().
 * Formato de entrada: iv_hex:encrypted_hex
 */
export function decrypt(encrypted: string): string {
  try {
    const parts = encrypted.split(":")
    if (parts.length !== 2) {
      throw new Error("Formato inválido. Se espera iv:encrypted")
    }

    const iv = Buffer.from(parts[0], "hex")
    const encryptedText = parts[1]
    const key = crypto.scryptSync(SECRET_KEY, "salt", 32)

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)

    let decrypted = decipher.update(encryptedText, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (error) {
    console.error("[crypto] Error desencriptando:", error)
    throw new Error("No se pudo desencriptar el valor. Verifica SMTP_ENCRYPTION_KEY.")
  }
}

/**
 * Genera una clave aleatoria de 32 caracteres para SMTP_ENCRYPTION_KEY.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("base64").substring(0, 32)
}
