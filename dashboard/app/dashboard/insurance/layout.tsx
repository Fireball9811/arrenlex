import { ReactNode } from "react"
import Image from "next/image"
import { SpecialSidebar } from "@/components/layout/special-sidebar"
import { UserEmail } from "@/components/auth/user-email"

export default function InsuranceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <SpecialSidebar role="insurance_special" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-24 items-center justify-between bg-white px-6 shadow">
          <div className="font-semibold text-gray-700">Sistema Arrenlex - Seguros</div>
          <div className="flex items-center gap-4">
            <UserEmail />
            <Image src="/Logo.png" alt="Arrenlex" width={280} height={92} className="h-20 w-auto object-contain" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
