/**
 * Sistema de logging seguro que sanitiza información sensible.
 *
 * Uso:
 * ```ts
 * import { secureLog } from "@/lib/logging/secure-logger"
 *
 * secureLog.info("[api/auth] Login successful", { userId: user.id })
 * secureLog.error("[api/auth] Login failed", { reason: "invalid_credentials" })
 * ```
 */

type LogLevel = "info" | "warn" | "error" | "debug"

interface SanitizeOptions {
  /** Campos que siempre deben ser sanitizados (lowercase) */
  sensitiveFields?: string[]
  /** Nivel de detalle: minimal, normal, verbose */
  detail?: "minimal" | "normal" | "verbose"
}

const DEFAULT_SENSITIVE_FIELDS = [
  "password",
  "passwordhash",
  "newpassword",
  "currentpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "creditcard",
  "ssn",
  "cedula",
  "email",
  "telefono",
  "celular",
  "direccion",
  "ip",
  "useragent",
  "user_agent",
  "x-forwarded-for",
  "x-real-ip",
]

/**
 * Sanitiza un objeto removiendo o enmascarando información sensible
 */
function sanitizeObject(obj: unknown, options: SanitizeOptions = {}): unknown {
  const { sensitiveFields = DEFAULT_SENSITIVE_FIELDS, detail = "normal" } = options

  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options))
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const keyLower = key.toLowerCase()

    // Verificar si es un campo sensible
    const isSensitive = sensitiveFields.some((sf) => keyLower.includes(sf))

    if (isSensitive) {
      if (detail === "verbose") {
        // En verbose, mostramos solo los primeros caracteres
        result[key] = maskSensitive(value)
      } else {
        // En normal/minimal, removemos completamente
        result[key] = "[REDACTED]"
      }
    } else if (typeof value === "object" && value !== null) {
      // Recursivamente sanitizar objetos anidados
      result[key] = sanitizeObject(value, options)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Enmascara valores sensibles mostrando solo los primeros caracteres
 */
function maskSensitive(value: unknown): string {
  if (typeof value !== "string") {
    return "[REDACTED]"
  }

  if (value.length <= 4) {
    return "***"
  }

  // Mostrar primeros 2 caracteres + *** + últimos 2 caracteres
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

/**
 * Logger seguro que sanitiza automáticamente información sensible
 */
class SecureLogger {
  private isDev = process.env.NODE_ENV === "development"

  private shouldLog(level: LogLevel): boolean {
    // En desarrollo, loguear todo
    if (this.isDev) return true

    // En producción, no loguear debug
    if (level === "debug") return false

    return true
  }

  private formatMessage(context: string, data?: Record<string, unknown>, options?: SanitizeOptions): string {
    if (!data || Object.keys(data).length === 0) {
      return context
    }

    const sanitized = sanitizeObject(data, options) as Record<string, unknown>
    return `${context} ${JSON.stringify(sanitized)}`
  }

  info(context: string, data?: Record<string, unknown>, options?: SanitizeOptions): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage(context, data, options))
    }
  }

  warn(context: string, data?: Record<string, unknown>, options?: SanitizeOptions): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage(context, data, options))
    }
  }

  error(context: string, error?: unknown, options?: SanitizeOptions): void {
    if (!this.shouldLog("error")) return

    let errorData: Record<string, unknown> = {}

    if (error instanceof Error) {
      // En producción, solo el mensaje, no el stack trace
      if (this.isDev) {
        errorData = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      } else {
        errorData = {
          name: error.name,
          message: error.message,
        }
      }
    } else if (typeof error === "string") {
      errorData = { message: error }
    } else if (error && typeof error === "object") {
      errorData = error as Record<string, unknown>
    }

    console.error(this.formatMessage(context, errorData, options))
  }

  debug(context: string, data?: Record<string, unknown>, options?: SanitizeOptions): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage(context, data, options))
    }
  }

  /**
   * Loguea una acción de usuario (login, logout, etc.)
   * Sanitiza automáticamente emails, IPs, etc.
   */
  userAction(
    action: string,
    userId?: string,
    data?: Record<string, unknown>
  ): void {
    this.info(`[USER_ACTION] ${action}`, {
      userId: userId ? maskSensitive(userId) : undefined,
      timestamp: new Date().toISOString(),
      ...data,
    })
  }

  /**
   * Loguea un error de seguridad (auth fallida, etc.)
   * Siempre sanitiza información sensible
   */
  securityError(
    context: string,
    error?: unknown,
    data?: Record<string, unknown>
  ): void {
    this.error(`[SECURITY] ${context}`, {
      ...data,
      error,
    }, { detail: "minimal" })
  }
}

// Exportar instancia única
export const secureLog = new SecureLogger()

// Exportar tipos
export type { LogLevel, SanitizeOptions }
