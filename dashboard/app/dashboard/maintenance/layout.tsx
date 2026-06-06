import { ReactNode } from "react"
import Image from "next/image"
import { SpecialSidebar } from "@/components/layout/special-sidebar"
import { UserEmail } from "@/components/auth/user-email"
import { AuthProvider } from "@/components/auth/auth-provider"
import { getSessionUser } from "@/lib/auth/session"

export default async function MaintenanceLayout({ children }: { children: ReactNode }) {
  const session = await getSessionUser()

  return (
    <AuthProvider initialUser={session}>
      <div className="flex h-screen bg-gray-100">
        <SpecialSidebar role="maintenance_special" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-24 items-center justify-between bg-white px-6 shadow">
            <div className="font-semibold text-gray-700">Sistema Arrenlex - Mantenimiento</div>
            <div className="flex items-center gap-4">
              <UserEmail email={session?.email} />
              <Image src="/Logo.png" alt="Arrenlex" width={280} height={92} className="h-20 w-auto object-contain" />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  )
}
