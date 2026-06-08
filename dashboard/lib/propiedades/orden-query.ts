import type { Propiedad } from "@/lib/types/database"

type OrderablePropiedad = Pick<Propiedad, "orden_display" | "created_at">

/**
 * Orden de visualización para el módulo propietario:
 * orden_display ASC (null al final), luego created_at DESC.
 */
export function sortPropiedadesByOrden<T extends OrderablePropiedad>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ordenA = a.orden_display
    const ordenB = b.orden_display

    if (ordenA != null && ordenB != null) {
      if (ordenA !== ordenB) return ordenA - ordenB
    } else if (ordenA != null && ordenB == null) {
      return -1
    } else if (ordenA == null && ordenB != null) {
      return 1
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function applyPropietarioOrdenToQuery<T extends { order: (...args: unknown[]) => T }>(
  query: T
): T {
  return query
    .order("orden_display", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false }) as T
}
