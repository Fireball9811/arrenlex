"use client"

import { useCallback, useEffect, useState } from "react"
import type { NavCounts } from "@/lib/nav/counts-server"

const EMPTY: NavCounts = { solicitudes: 0, intake: 0, mantenimiento: 0 }

export function useNavCounts(enabled: boolean) {
  const [counts, setCounts] = useState<NavCounts>(EMPTY)

  const fetchCounts = useCallback(async () => {
    if (!enabled) return

    try {
      const res = await fetch("/api/nav/counts")
      if (res.ok) {
        const data: NavCounts = await res.json()
        setCounts({
          solicitudes: Number(data.solicitudes) || 0,
          intake: Number(data.intake) || 0,
          mantenimiento: Number(data.mantenimiento) || 0,
        })
      }
    } catch {
      setCounts(EMPTY)
    }
  }, [enabled])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchCounts()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [fetchCounts, enabled])

  return counts
}
