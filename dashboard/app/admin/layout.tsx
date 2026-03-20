import { ReactNode } from "react"
import Image from "next/image"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { UserEmail } from "@/components/auth/user-email"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-24 items-center justify-between bg-white px-6 shadow">
          <div className="font-semibold text-gray-700">Sistema Arrenlex</div>
          <div className="flex items-center gap-4">
            <UserEmail />
            <div className="relative h-20 w-auto">
              <Image src="/Logo.png" alt="Arrenlex" fill className="object-contain" priority />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
