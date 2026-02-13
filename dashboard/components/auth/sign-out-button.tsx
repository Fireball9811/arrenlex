"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function SignOutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="block w-full rounded p-2 text-left text-sm transition hover:bg-gray-800"
    >
      {children}
    </button>
  )
}
