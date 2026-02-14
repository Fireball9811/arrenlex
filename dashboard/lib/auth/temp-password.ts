import { randomBytes } from "crypto"

/**
 * Genera una contraseña temporal segura para invitaciones.
 * Incluye mayúsculas, minúsculas, números y un carácter especial
 * para cumplir políticas típicas de Supabase.
 * Solo para uso en servidor (API routes).
 */
export function generateTempPassword(): string {
  const length = 12
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghjkmnpqrstuvwxyz"
  const digits = "23456789"
  const special = "!@#$%&*"
  const all = upper + lower + digits + special

  const bytes = randomBytes(length)
  const chars: string[] = []
  chars.push(upper[bytes[0] % upper.length])
  chars.push(lower[bytes[1] % lower.length])
  chars.push(digits[bytes[2] % digits.length])
  chars.push(special[bytes[3] % special.length])

  for (let i = 4; i < length; i++) {
    chars.push(all[bytes[i] % all.length])
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i % 4] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join("")
}
