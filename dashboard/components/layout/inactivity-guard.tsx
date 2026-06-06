"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signOutUser } from "@/lib/auth/sign-out-client"

const INACTIVITY_MS = 30 * 60 * 1000       // 30 minutos → logout
const WARNING_BEFORE_MS = 5 * 60 * 1000    // aviso 5 minutos antes (a los 25 min)
const ACTIVITY_DEBOUNCE_MS = 1500          // evita resetear timers en cada mousemove

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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningStartRef = useRef<number>(0)
  const isLoggingOutRef = useRef(false)

  const clearAllTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
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

  const performLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true

    const result = await signOutUser()
    if (result.success) {
      router.push("/login")
      router.refresh()
    } else {
      isLoggingOutRef.current = false
    }
  }, [router])

  const resetTimers = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)
    setCountdown(WARNING_BEFORE_MS)

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      startCountdownInterval()

      logoutTimerRef.current = setTimeout(() => {
        void performLogout()
      }, WARNING_BEFORE_MS)
    }, INACTIVITY_MS - WARNING_BEFORE_MS)
  }, [clearAllTimers, startCountdownInterval, performLogout])

  const scheduleResetTimers = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      resetTimers()
    }, ACTIVITY_DEBOUNCE_MS)
  }, [resetTimers])

  const handleContinue = useCallback(() => {
    resetTimers()
  }, [resetTimers])

  useEffect(() => {
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, scheduleResetTimers, { passive: true }))
    resetTimers()

    return () => {
      clearAllTimers()
      events.forEach((e) => window.removeEventListener(e, scheduleResetTimers))
    }
  }, [scheduleResetTimers, resetTimers, clearAllTimers])

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
