/**
 * Utilidades de seguridad para prevenir ataques comunes
 */

/**
 * Genera un delay constante para prevenir ataques de timing
 * que permiten enumerar usuarios o medir tiempos de respuesta.
 *
 * @param ms Milisegundos de delay (recomendado: 500-1000ms)
 * @returns Promise que se resuelve después del delay
 */
export async function constantDelay(ms: number = 500): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Genera un delay aleatorio dentro de un rango para añadir incertidumbre
 * adicional a los tiempos de respuesta.
 *
 * @param minMs Delay mínimo en milisegundos
 * @param maxMs Delay máximo en milisegundos
 * @returns Promise que se resuelve después del delay aleatorio
 */
export async function randomDelay(minMs: number = 400, maxMs: number = 600): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  await new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Ejecuta una operación con un delay constante independientemente del resultado.
 * Útil para prevenir timing attacks en endpoints de autenticación.
 *
 * @param operation La operación a ejecutar
 * @param delayMs El delay constante en milisegundos
 * @returns El resultado de la operación
 */
export async function withConstantDelay<T>(
  operation: () => Promise<T>,
  delayMs: number = 500
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await operation()
    const elapsed = Date.now() - startTime
    const remainingDelay = Math.max(0, delayMs - elapsed)

    if (remainingDelay > 0) {
      await constantDelay(remainingDelay)
    }

    return result
  } catch (error) {
    // También aplicamos delay en caso de error
    const elapsed = Date.now() - startTime
    const remainingDelay = Math.max(0, delayMs - elapsed)

    if (remainingDelay > 0) {
      await constantDelay(remainingDelay)
    }

    throw error
  }
}
