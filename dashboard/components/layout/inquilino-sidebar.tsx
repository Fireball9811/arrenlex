"use client"

import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { UserEmail } from "@/components/auth/user-email"
import { useLang } from "@/lib/i18n/context"

export function InquilinoSidebar() {
  const { t, lang, setLang } = useLang()

  return (
    <aside className="flex w-64 flex-col bg-gray-900 text-white">
      <Link href="/inquilino/dashboard" className="flex items-center gap-2 border-b border-gray-700 p-6">
        <Image src="/Logo.png" alt="Arrenlex" width={180} height={60} className="h-16 w-auto" />
      </Link>
      <nav className="flex-1 space-y-2 p-4">
        <Link href="/inquilino/dashboard" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.dashboard}
        </Link>
        <Link href="/inquilino/mis-datos" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.misDatos}
        </Link>
        <Link href="/inquilino/mis-contratos" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.misContratos}
        </Link>
        <Link href="/inquilino/documentos" className="block rounded p-2 transition hover:bg-gray-800">
          Mis Documentos
        </Link>
        <Link href="/catalogo" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.verPropiedades}
        </Link>
        <Link href="/inquilino/pagos" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.misPagos}
        </Link>
        <Link href="/mantenimiento" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.mantenimiento}
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
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
