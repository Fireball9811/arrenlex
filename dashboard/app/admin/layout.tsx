import { ReactNode } from "react"
import Image from "next/image"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { UserEmail } from "@/components/auth/user-email"
import { InactivityGuard } from "@/components/layout/inactivity-guard"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <InactivityGuard>
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Marca de agua protagonista */}
          <div className="pointer-events-none select-none absolute inset-0 z-0 flex items-center justify-center">
            <Image src="/Logo2.png" alt="" width={700} height={700} className="w-[600px] opacity-[0.06] object-contain" />
          </div>

          <header className="relative z-10 flex h-24 items-center justify-between bg-white px-8 shadow">
            <div className="flex flex-col leading-tight">
              <span className="text-2xl font-bold tracking-tight text-gray-800">Sistema de Gestión</span>
              <span className="text-sm font-semibold uppercase tracking-widest text-gray-500">de Arrendamientos</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-medium text-gray-400 sm:block">Sesión activa</span>
              <div className="text-base font-semibold text-gray-700">
                <UserEmail />
              </div>
            </div>
          </header>

          <main className="relative z-10 flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </InactivityGuard>
  )
}
