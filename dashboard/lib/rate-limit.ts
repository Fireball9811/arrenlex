/**
 * Sistema de Rate Limiting para prevenir abusos y ataques de fuerza bruta.
 *
 * Implementa rate limiting usando memoria compartida para Edge Runtime.
 * Para producción con múltiples servidores, considera usar Redis o Vercel Edge Config.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Almacén en memoria (se reinicia cada deploy, suficiente para Edge Runtime)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Intervalo de limpieza de entradas expiradas (cada 5 minutos)
const CLEANUP_INTERVAL = 5 * 60 * 1000

// Limpiar entradas expiradas periódicamente
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

export interface RateLimitConfig {
  /** Número máximo de solicitudes permitidas */
  limit: number
  /** Ventana de tiempo en milisegundos */
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Configuraciones predefinidas para diferentes tipos de endpoints
 */
export const RateLimitPresets = {
  /** Login: 5 intentos por 15 minutos */
  login: { limit: 5, windowMs: 15 * 60 * 1000 } as RateLimitConfig,

  /** Password reset: 3 solicitudes por hora */
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 } as RateLimitConfig,

  /** Formularios públicos: 10 solicitudes por hora */
  publicForm: { limit: 10, windowMs: 60 * 60 * 1000 } as RateLimitConfig,

  /** Contacto: 5 mensajes por hora */
  contact: { limit: 5, windowMs: 60 * 60 * 1000 } as RateLimitConfig,

  /** API general: 100 solicitudes por minuto */
  api: { limit: 100, windowMs: 60 * 1000 } as RateLimitConfig,
}

/**
 * Crea un identificador único para el rate limiting basado en IP y opcionalmente user ID
 */
function getRateLimitKey(
  identifier: string,
  endpoint: string
): string {
  return `ratelimit:${endpoint}:${identifier}`
}

/**
 * Verifica si una solicitud debe ser rate-limited
 *
 * @param identifier Identificador único (IP, user ID, etc.)
 * @param endpoint Nombre del endpoint para el key
 * @param config Configuración de rate limit
 * @returns Resultado del rate limit
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = getRateLimitKey(identifier, endpoint)
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Si no existe entrada o expiró, crear nueva
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime: entry.resetTime,
    }
  }

  // Incrementar contador
  entry.count++

  // Verificar si excedió el límite
  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Actualizar entrada
  rateLimitStore.set(key, entry)

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Obtiene la dirección IP del cliente desde la solicitud
 */
export function getClientIp(request: Request): string {
  // Intentar obtener de headers comunes
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")

  if (forwardedFor) {
    // x-forwarded-for puede tener múltiples IPs, tomar la primera
    return forwardedFor.split(",")[0].trim()
  }

  if (realIp) {
    return realIp.trim()
  }

  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  // Fallback a un identificador genérico
  return "unknown"
}

/**
 * Middleware de rate limiting para Next.js API routes
 *
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   const rateLimit = await rateLimitMiddleware(request, RateLimitPresets.login)
 *   if (!rateLimit.success) {
 *     return NextResponse.json(
 *       { error: "Too many requests" },
 *       { status: 429, headers: getRateLimitHeaders(rateLimit) }
 *     )
 *   }
 *   // ... tu código aquí
 * }
 * ```
 */
export function rateLimitMiddleware(
  request: Request,
  config: RateLimitConfig,
  endpoint?: string
): RateLimitResult {
  const ip = getClientIp(request)
  const endpointName = endpoint || new URL(request.url).pathname

  return checkRateLimit(ip, endpointName, config)
}

/**
 * Genera headers HTTP estándar de rate limit para la respuesta
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
    "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
  }
}

/**
 * Respuesta de error estandarizada para rate limit exceeded
 */
export function rateLimitErrorResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
  const retryAfterMinutes = Math.ceil(retryAfter / 60)

  return new Response(
    JSON.stringify({
      error: "Demasiadas solicitudes. Por favor intenta más tarde.",
      retryAfter: `${retryAfterMinutes} minuto${retryAfterMinutes !== 1 ? "s" : ""}`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...getRateLimitHeaders(result),
      },
    }
  )
}
