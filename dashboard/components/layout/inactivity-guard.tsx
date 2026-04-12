"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const INACTIVITY_MS = 30 * 60 * 1000       // 30 minutos → logout
const WARNING_BEFORE_MS = 5 * 60 * 1000    // aviso 5 minutos antes (a los 25 min)

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function InactivityGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(WARNING_BEFORE_MS)

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const warningStartRef = useRef<number>(0)

  const clearAllTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
  }, [])

  const startCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    warningStartRef.current = Date.now()
    setCountdown(WARNING_BEFORE_MS)

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - warningStartRef.current
      const remaining = WARNING_BEFORE_MS - elapsed
      if (remaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
        setCountdown(0)
      } else {
        setCountdown(remaining)
      }
    }, 500)
  }, [])

  const resetTimers = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)
    setCountdown(WARNING_BEFORE_MS)

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      startCountdownInterval()

      logoutTimerRef.current = setTimeout(async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
      }, WARNING_BEFORE_MS)
    }, INACTIVITY_MS - WARNING_BEFORE_MS)
  }, [clearAllTimers, startCountdownInterval, router])

  const handleContinue = useCallback(() => {
    resetTimers()
  }, [resetTimers])

  useEffect(() => {
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }))
    resetTimers()

    return () => {
      clearAllTimers()
      events.forEach((e) => window.removeEventListener(e, resetTimers))
    }
  }, [resetTimers, clearAllTimers])

  return (
    <>
      {children}
      {showWarning && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-amber-600 px-6 py-3 text-white shadow-lg">
          <p className="text-sm font-medium">
            ⚠ Tu sesión cerrará por inactividad en{" "}
            <span className="font-bold tabular-nums">{formatCountdown(countdown)}</span>
          </p>
          <button
            onClick={handleContinue}
            className="shrink-0 rounded bg-white px-4 py-1.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
          >
            Continuar sesión
          </button>
        </div>
      )}
    </>
  )
}
