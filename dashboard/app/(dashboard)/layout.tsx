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
          <Image src="/Logo.png" alt="" width={220} height={220} className="w-48 object-contain" />
        </div>
        <Link
          href="/dashboard"
          className="relative flex items-center gap-2 border-b border-indigo-700 p-6"
        >
          <Image src="/Logo.png" alt="Arrenlex" width={180} height={60} className="h-12 w-auto" />
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 bg-white shadow flex items-center justify-between px-6">
          <div className="font-semibold text-gray-700">
            Sistema Arrenlex
          </div>
          <div className="flex items-center gap-4">
            <UserEmail />
            <Image
              src="/Logo.png"
              alt="Arrenlex"
              width={280}
              height={92}
              className="h-20 w-auto object-contain"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <InactivityGuard>
            <RoleGuard>{children}</RoleGuard>
          </InactivityGuard>
        </main>
      </div>
    </div>
  )
}
