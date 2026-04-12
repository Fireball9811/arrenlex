"use client"

import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { useLang } from "@/lib/i18n/context"

export function InquilinoSidebar() {
  const { t, lang, setLang } = useLang()

  return (
    <aside className="relative flex w-64 flex-col bg-blue-100 text-blue-900 overflow-hidden">
      {/* Marca de agua */}
      <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.12]">
        <Image src="/Logo2.png" alt="" width={220} height={220} className="w-48 object-contain" />
      </div>

      <Link href="/inquilino/dashboard" className="relative flex items-center gap-2 border-b border-blue-300 p-6">
        <Image src="/Logo2.png" alt="Arrenlex" width={180} height={60} className="h-16 w-auto" />
      </Link>
      <nav className="relative flex-1 space-y-2 p-4">
        <Link href="/inquilino/dashboard" className="block rounded p-2 transition hover:bg-blue-200">
          {t.sidebar.dashboard}
        </Link>
        <Link href="/inquilino/mis-datos" className="block rounded p-2 transition hover:bg-blue-200">
          {t.sidebar.misDatos}
        </Link>
        <Link href="/inquilino/documentos" className="block rounded p-2 transition hover:bg-blue-200">
          Mis Documentos
        </Link>
        <Link href="/inquilino/pagos" className="block rounded p-2 transition hover:bg-blue-200">
          {t.sidebar.misPagos}
        </Link>
        <Link href="/inquilino/mantenimiento" className="block rounded p-2 transition hover:bg-blue-200">
          {t.sidebar.mantenimiento}
        </Link>
      </nav>
      <div className="relative space-y-2 border-t border-blue-300 p-4">
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex w-full items-center justify-center gap-1 rounded p-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-200 hover:text-blue-900"
        >
          <span className={lang === "es" ? "text-blue-900" : "text-blue-500"}>ES</span>
          <span className="text-blue-400">|</span>
          <span className={lang === "en" ? "text-blue-900" : "text-blue-500"}>EN</span>
        </button>
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-blue-900 transition hover:bg-blue-200">
          {t.sidebar.cambioContrasena}
        </Link>
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
