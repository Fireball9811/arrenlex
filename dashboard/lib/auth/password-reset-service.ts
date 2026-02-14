import crypto from "crypto"
import bcrypt from "bcrypt"
import { createAdminClient } from "@/lib/supabase/admin"

const RESET_TOKEN_BYTES = 32
const RESET_TOKEN_EXPIRY_MINUTES = 15
const BCRYPT_ROUNDS = 10

const USERS_TABLE = "Users"
const USER_COLUMNS = "id, email, passwordHash, resetToken, resetTokenExpires, role"

/** Hashea el token en texto plano para guardar en DB (nunca guardar el token plano). */
export function hashResetToken(plainToken: string): string {
  return crypto.createHash("sha256").update(plainToken).digest("hex")
}

/** Genera un token seguro en texto plano (solo para enviarlo por email). */
export function generateResetToken(): string {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex")
}

/** Expiración del token: ahora + 15 minutos. */
export function getResetTokenExpiry(): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES)
  return d
}

export type UserRow = {
  id: string
  email: string
  passwordHash: string
  resetToken: string | null
  resetTokenExpires: string | null
  role: string
}

/** Busca usuario por email. No revela si existe o no al llamador. */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select(USER_COLUMNS)
    .eq("email", email.trim().toLowerCase())
    .maybeSingle()

  if (error) {
    console.error("[password-reset-service] findUserByEmail:", error.message)
    throw new Error("Error al buscar usuario")
  }
  return data as UserRow | null
}

/** Guarda token hasheado y expiración para el usuario. */
export async function saveResetToken(
  userId: string,
  hashedToken: string,
  expiresAt: Date
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from(USERS_TABLE)
    .update({
      resetToken: hashedToken,
      resetTokenExpires: expiresAt.toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("[password-reset-service] saveResetToken:", error.message)
    throw new Error("Error al guardar token de reset")
  }
}

/** Busca usuario por token hasheado y que no haya expirado. */
export async function findUserByResetToken(hashedToken: string): Promise<UserRow | null> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select(USER_COLUMNS)
    .eq("resetToken", hashedToken)
    .gt("resetTokenExpires", now)
    .maybeSingle()

  if (error) {
    console.error("[password-reset-service] findUserByResetToken:", error.message)
    throw new Error("Error al validar token")
  }
  return data as UserRow | null
}

/** Actualiza contraseña y limpia token de reset. */
export async function updatePasswordAndClearToken(
  userId: string,
  newPasswordHash: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from(USERS_TABLE)
    .update({
      passwordHash: newPasswordHash,
      resetToken: null,
      resetTokenExpires: null,
    })
    .eq("id", userId)

  if (error) {
    console.error("[password-reset-service] updatePasswordAndClearToken:", error.message)
    throw new Error("Error al actualizar contraseña")
  }
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS)
}

export async function comparePassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash)
}

/** Valida formato de contraseña: mínimo 8 caracteres. */
export function isPasswordValid(password: string): boolean {
  return typeof password === "string" && password.length >= 8
}

/** Sanitiza email: trim y lowercase. */
export function sanitizeEmail(email: string): string {
  return String(email).trim().toLowerCase()
}
