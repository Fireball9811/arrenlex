import { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { UserEmail } from "@/components/auth/user-email"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { DashboardSidebarFooter } from "@/components/layout/dashboard-sidebar-footer"
import { RoleGuard } from "@/components/layout/role-guard"
import { InactivityGuard } from "@/components/layout/inactivity-guard"
import { PropietarioSidebar } from "@/components/layout/propietario-sidebar"
import { InquilinoSidebar } from "@/components/layout/inquilino-sidebar"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user ? await getUserRole(supabase, user) : null

  const renderSidebar = () => {
    if (role === "propietario") return <PropietarioSidebar />
    if (role === "inquilino") return <InquilinoSidebar />
    if (role === "admin") return <AdminSidebar />
    return (
      <aside className="relative flex w-64 flex-col bg-indigo-900 text-white overflow-hidden">
        <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <Image src="/Logo2.png" alt="" width={220} height={220} className="w-48 object-contain" />
        </div>
        <Link
          href="/dashboard"
          className="relative flex justify-center border-b border-indigo-700 py-4"
        >
          <Image src="/Logo2.png" alt="Arrenlex" width={720} height={240} className="h-64 w-auto" />
        </Link>
        <DashboardNav />
        <DashboardSidebarFooter />
      </aside>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {renderSidebar()}

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* Marca de agua protagonista */}
        <div className="pointer-events-none select-none absolute inset-0 z-0 flex items-center justify-center">
          <Image src="/Logo2.png" alt="" width={700} height={700} className="w-[600px] opacity-[0.06] object-contain" />
        </div>

        <header className="relative z-10 h-24 bg-white shadow flex items-center justify-between px-8">
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

        <main className="relative z-10 flex-1 overflow-y-auto p-6">
          <InactivityGuard>
            <RoleGuard>{children}</RoleGuard>
          </InactivityGuard>
        </main>
      </div>
    </div>
  )
}
