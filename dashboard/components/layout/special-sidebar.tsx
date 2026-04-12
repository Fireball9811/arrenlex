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
    <aside className="relative flex w-64 flex-col bg-indigo-900 text-white overflow-hidden">
      {/* Marca de agua */}
      <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
        <Image src="/Logo2.png" alt="" width={220} height={220} className="w-48 object-contain" />
      </div>

      <Link href={config.path} className="relative flex justify-center border-b border-indigo-700 py-4">
        <Image src="/Logo2.png" alt="Arrenlex" width={720} height={240} className="h-64 w-auto" />
      </Link>

      <nav className="relative flex-1 space-y-2 p-4">
        <Link href={config.path} className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.dashboard}
        </Link>
      </nav>

      <div className="relative space-y-2 border-t border-indigo-700 p-4">
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex w-full items-center justify-center gap-1 rounded p-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-800 hover:text-white"
        >
          <span className={lang === "es" ? "text-white" : "text-indigo-400"}>ES</span>
          <span className="text-indigo-600">|</span>
          <span className={lang === "en" ? "text-white" : "text-indigo-400"}>EN</span>
        </button>
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-white transition hover:bg-indigo-800">
          {t.sidebar.cambioContrasena}
        </Link>
        <AdjuntarDocumentos sidebar />
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
