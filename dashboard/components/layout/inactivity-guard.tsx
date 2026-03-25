"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const INACTIVITY_MS = 60 * 60 * 1000 // 1 hora

export function InactivityGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const signOutAndRedirect = async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(signOutAndRedirect, INACTIVITY_MS)
    }

    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }, [router])

  return <>{children}</>
}
