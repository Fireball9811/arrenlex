"use client"

import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { UserEmail } from "@/components/auth/user-email"
import { AdjuntarDocumentos } from "@/components/layout/adjuntar-documentos"
import { useLang } from "@/lib/i18n/context"
import type { UserRole } from "@/lib/auth/role"

interface SpecialSidebarProps {
  role: UserRole
}

const ROLE_CONFIG = {
  maintenance_special: {
    title: "Mantenimiento",
    path: "/dashboard/maintenance"
  },
  insurance_special: {
    title: "Seguros",
    path: "/dashboard/insurance"
  },
  lawyer_special: {
    title: "Legal",
    path: "/dashboard/legal"
  }
}

export function SpecialSidebar({ role }: SpecialSidebarProps) {
  const { t, lang, setLang } = useLang()
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]

  return (
    <aside className="flex w-64 flex-col bg-gray-900 text-white">
      <Link href={config.path} className="flex items-center gap-2 border-b border-gray-700 p-6">
        <Image src="/Logo.png" alt="Arrenlex" width={180} height={60} className="h-16 w-auto" />
      </Link>

      <nav className="flex-1 space-y-2 p-4">
        <Link href={config.path} className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.dashboard}
        </Link>
      </nav>

      <div className="space-y-2 border-t border-gray-700 p-4">
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex w-full items-center justify-center gap-1 rounded p-2 text-xs font-semibold text-gray-400 transition hover:bg-gray-800 hover:text-white"
        >
          <span className={lang === "es" ? "text-white" : "text-gray-500"}>ES</span>
          <span className="text-gray-600">|</span>
          <span className={lang === "en" ? "text-white" : "text-gray-500"}>EN</span>
        </button>
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-white transition hover:bg-gray-800">
          {t.sidebar.cambioContrasena}
        </Link>
        <AdjuntarDocumentos sidebar />
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
