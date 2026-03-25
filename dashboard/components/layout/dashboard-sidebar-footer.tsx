"use client"

import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { AdjuntarDocumentos } from "@/components/layout/adjuntar-documentos"
import { useLang } from "@/lib/i18n/context"

export function DashboardSidebarFooter() {
  const { t, lang, setLang } = useLang()

  return (
    <div className="relative space-y-2 border-t border-indigo-700 p-4">
      <button
        onClick={() => setLang(lang === "es" ? "en" : "es")}
        className="flex w-full items-center justify-center gap-1 rounded p-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-800 hover:text-white"
      >
        <span className={lang === "es" ? "text-white" : "text-indigo-400"}>ES</span>
        <span className="text-indigo-600">|</span>
        <span className={lang === "en" ? "text-white" : "text-indigo-400"}>EN</span>
      </button>
      <Link
        href="/cambio-contrasena"
        className="block rounded p-2 text-left text-sm text-white transition hover:bg-indigo-800"
      >
        {t.sidebar.cambioContrasena}
      </Link>
      <AdjuntarDocumentos sidebar />
      <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
    </div>
  )
}
