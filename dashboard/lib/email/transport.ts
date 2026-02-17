/**
 * Sistema de envío de correos usando SMTP desde Supabase.
 * Las credenciales se guardan encriptadas en la tabla smtp_config.
 * Requiere: SMTP_ENCRYPTION_KEY en .env.local
 */

import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"
import { decrypt } from "../crypto"

// Cache del transporter SMTP
let smtpTransporter: nodemailer.Transporter | null = null
let smtpConfigCache: SmtpConfig | null = null

// Cache de la configuración de email (from address)
let emailFromCache: string | null = null

interface SmtpConfig {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass_encrypted: string
  email_from: string
  active: boolean
}

/**
 * Obtiene el cliente admin de Supabase para leer la configuración SMTP.
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[email] Supabase no configurado")
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Carga la configuración SMTP desde Supabase (tabla smtp_config).
 * Las credenciales vienen encriptadas y se desencriptan aquí.
 */
async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("smtp_config")
    .select("*")
    .eq("active", true)
    .order("id", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error("[email] Error cargando configuración SMTP:", error)
    return null
  }

  if (!data) {
    console.error("[email] No hay configuración SMTP activa en smtp_config")
    return null
  }

  smtpConfigCache = data
  return data
}

/**
 * Desencripta la contraseña SMTP usando la clave de encriptación.
 */
function getDecryptedPassword(encrypted: string): string | null {
  try {
    return decrypt(encrypted)
  } catch (error) {
    console.error("[email] Error desencriptando contraseña SMTP:", error)
    return null
  }
}

/**
 * Obtiene el transporter SMTP de nodemailer.
 * Lee la configuración desde Supabase y la cachea.
 */
export async function getSmtpTransporter(): Promise<nodemailer.Transporter | null> {
  // Retornar cache si existe
  if (smtpTransporter) return smtpTransporter

  // Cargar configuración desde Supabase
  const config = await loadSmtpConfig()
  if (!config) return null

  // Desencriptar contraseña
  const password = getDecryptedPassword(config.smtp_pass_encrypted)
  if (!password) return null

  // Crear transporter
  try {
    smtpTransporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465, // SSL para puerto 465
      requireTLS: config.smtp_port === 587, // STARTTLS para puerto 587
      auth: {
        user: config.smtp_user,
        pass: password,
      },
      tls: {
        servername: config.smtp_host,
        rejectUnauthorized: true,
      },
    })

    // Verificar conexión
    await smtpTransporter.verify()
    console.log("[email] SMTP conectado correctamente")

    // Cachear email from
    emailFromCache = config.email_from

    return smtpTransporter
  } catch (error) {
    console.error("[email] Error creando transporter SMTP:", error)
    return null
  }
}

/**
 * Obtiene el email remitente configurado.
 */
export function getEmailFrom(): string {
  return emailFromCache || process.env.EMAIL_FROM || "Arrenlex <ceo@arrenlex.com>"
}

/**
 * Refresca la configuración SMTP (útil después de actualizar en BD).
 */
export async function refreshSmtpConfig(): Promise<boolean> {
  smtpTransporter = null
  smtpConfigCache = null
  emailFromCache = null

  const transporter = await getSmtpTransporter()
  return transporter !== null
}

/**
 * Verifica si la configuración SMTP está funcionando.
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await getSmtpTransporter()
    if (!transporter) {
      return { success: false, error: "No se pudo crear el transporter SMTP" }
    }

    await transporter.verify()
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    return { success: false, error: message }
  }
}
