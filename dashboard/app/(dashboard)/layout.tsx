import { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { UserEmail } from "@/components/auth/user-email"
import { AdjuntarDocumentos } from "@/components/layout/adjuntar-documentos"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { RoleGuard } from "@/components/layout/role-guard"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-gray-900 text-white">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 border-b border-gray-700 p-6"
        >
          <Image
            src="/Logo.png"
            alt="Arrenlex"
            width={180}
            height={60}
            className="h-12 w-auto"
          />
        </Link>

        <DashboardNav />

        <div className="space-y-2 border-t border-gray-700 p-4">
          <Link
            href="/cambio-contrasena"
            className="block rounded p-2 text-left text-sm text-white transition hover:bg-gray-800"
          >
            Cambio de contraseña
          </Link>
          <AdjuntarDocumentos sidebar />
          <SignOutButton>Cerrar sesión</SignOutButton>
        </div>
      </aside>

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
          <RoleGuard>{children}</RoleGuard>
        </main>
      </div>
    </div>
  )
}
