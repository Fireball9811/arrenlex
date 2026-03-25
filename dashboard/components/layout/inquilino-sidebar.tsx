"use client"

import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { UserEmail } from "@/components/auth/user-email"
import { useLang } from "@/lib/i18n/context"

export function InquilinoSidebar() {
  const { t, lang, setLang } = useLang()

  return (
    <aside className="relative flex w-64 flex-col bg-indigo-900 text-white overflow-hidden">
      {/* Marca de agua */}
      <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
        <Image src="/Logo.png" alt="" width={220} height={220} className="w-48 object-contain" />
      </div>

      <Link href="/inquilino/dashboard" className="relative flex items-center gap-2 border-b border-indigo-700 p-6">
        <Image src="/Logo.png" alt="Arrenlex" width={180} height={60} className="h-16 w-auto" />
      </Link>
      <nav className="relative flex-1 space-y-2 p-4">
        <Link href="/inquilino/dashboard" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.dashboard}
        </Link>
        <Link href="/inquilino/mis-datos" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.misDatos}
        </Link>
        <Link href="/inquilino/mis-contratos" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.misContratos}
        </Link>
        <Link href="/inquilino/documentos" className="block rounded p-2 transition hover:bg-indigo-800">
          Mis Documentos
        </Link>
        <Link href="/catalogo" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.verPropiedades}
        </Link>
        <Link href="/inquilino/pagos" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.misPagos}
        </Link>
        <Link href="/mantenimiento" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.mantenimiento}
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
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
